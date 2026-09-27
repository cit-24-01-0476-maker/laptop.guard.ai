import hashlib
import json
import secrets
import string
import uuid
from datetime import datetime, timedelta
from typing import Dict, Tuple
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from services.backend.database import get_db
from services.backend import models, schemas
from services.backend.auth import get_current_user
from services.backend.websocket_hub import hub

router = APIRouter(prefix="/pairing", tags=["Device Pairing"])

# In-memory rate limiting tracker: IP/User -> (failure_count, lockout_until)
rate_limit_failures: Dict[str, Tuple[int, datetime]] = {}

def check_pairing_rate_limit(key: str):
    now = datetime.utcnow()
    if key in rate_limit_failures:
        count, lockout_until = rate_limit_failures[key]
        if lockout_until and now < lockout_until:
            remaining = int((lockout_until - now).total_seconds())
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many failed pairing attempts. Please wait {remaining} seconds before trying again."
            )
        if lockout_until and now >= lockout_until:
            del rate_limit_failures[key]

def record_pairing_failure(key: str):
    now = datetime.utcnow()
    count = 1
    if key in rate_limit_failures:
        count = rate_limit_failures[key][0] + 1
    
    lockout = None
    if count >= 5:
        lockout = now + timedelta(minutes=15)
    rate_limit_failures[key] = (count, lockout)

def clear_pairing_failures(key: str):
    if key in rate_limit_failures:
        del rate_limit_failures[key]

def generate_human_pairing_code() -> str:
    """Generates clean human-readable code e.g. LG-7K4M-P92Q (no ambiguous chars)."""
    alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    part1 = "".join(secrets.choice(alphabet) for _ in range(4))
    part2 = "".join(secrets.choice(alphabet) for _ in range(4))
    return f"LG-{part1}-{part2}"

def hash_code(code: str) -> str:
    clean = code.strip().upper().replace(" ", "").replace("-", "")
    return hashlib.sha256(clean.encode("utf-8")).hexdigest()

def mask_email(email: str) -> str:
    parts = email.split("@")
    if len(parts) != 2:
        return email
    name, domain = parts
    if len(name) <= 2:
        masked = name[0] + "***"
    else:
        masked = name[:2] + "***"
    return f"{masked}@{domain}"


@router.post("/request", response_model=schemas.PairingRequestResponse)
def create_pairing_request(
    req: schemas.PairingRequestCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Called by Windows Sentinel to register device identity & initiate a secure,
    single-use 5-minute pairing session with cryptographic keypair.
    """
    # 1. Register or update Protected Device identity
    device = db.query(models.ProtectedDevice).filter(models.ProtectedDevice.id == req.device_id).first()
    now = datetime.utcnow()

    if not device:
        device = models.ProtectedDevice(
            id=req.device_id,
            device_public_id=f"pub_{secrets.token_hex(8)}",
            device_public_key=req.device_public_key,
            device_name=req.device_name,
            manufacturer=req.manufacturer or "Dell",
            model=req.model or "G15 5530",
            os_version=req.os_version or "Windows 11",
            agent_version=req.agent_version or "1.7.0",
            status="Unpaired",
            created_at=now,
            last_seen=now
        )
        db.add(device)
    else:
        device.device_public_key = req.device_public_key
        device.device_name = req.device_name
        device.last_seen = now

    # 2. Invalidate any previous pending pairing requests for this device
    old_requests = db.query(models.PairingRequest).filter(
        models.PairingRequest.protected_device_id == req.device_id,
        models.PairingRequest.status.in_(["PENDING", "CLAIMED"])
    ).all()
    for o in old_requests:
        o.status = "EXPIRED"

    # 3. Generate human-readable single-use pairing code
    raw_code = generate_human_pairing_code()
    code_h = hash_code(raw_code)
    code_prev = raw_code.split("-")[-1] # e.g. "P92Q"

    pairing_req_id = f"pair_{uuid.uuid4().hex[:12]}"
    expires_at = now + timedelta(minutes=5)

    target_email_clean = req.target_email.strip().lower() if req.target_email else None

    pairing_req = models.PairingRequest(
        id=pairing_req_id,
        protected_device_id=req.device_id,
        code_hash=code_h,
        code_preview=code_prev,
        target_email=target_email_clean,
        created_at=now,
        expires_at=expires_at,
        status="PENDING",
        attempt_count=0,
        requested_ip=request.client.host if request.client else None
    )
    db.add(pairing_req)

    # 4. Audit Log
    audit = models.AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        device_id=req.device_id,
        action="PAIRING_CODE_GENERATED",
        details_json=json.dumps({"request_id": pairing_req_id, "preview": code_prev, "target_email": target_email_clean}),
        ip_address=request.client.host if request.client else None,
        timestamp=now
    )
    db.add(audit)
    db.commit()

    qr_payload = json.dumps({
        "type": "LAPTOPGUARD_PAIRING",
        "pairing_request_id": pairing_req_id,
        "device_id": req.device_id,
        "pairing_code": raw_code,
        "target_email": target_email_clean,
        "cloud_url": "https://laptopguard-api.onrender.com",
        "expires_at": expires_at.isoformat()
    })

    return {
        "pairing_request_id": pairing_req_id,
        "device_id": req.device_id,
        "pairing_code": raw_code,
        "target_email": target_email_clean,
        "qr_payload": qr_payload,
        "expires_in_seconds": 300,
        "expires_at": expires_at,
        "status": "PENDING"
    }


@router.post("/claim", response_model=schemas.PairingClaimResponse)
def claim_pairing_code(
    claim_in: schemas.PairingClaimRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Called by authenticated user from Mobile or Web Dashboard.
    Validates code, rate-limits attempts, and marks code CLAIMED pending local laptop confirmation.
    """
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"claim_{current_user.id}_{client_ip}"
    check_pairing_rate_limit(rate_key)

    raw_code = (claim_in.pairing_code or "").strip()
    if not raw_code:
        record_pairing_failure(rate_key)
        raise HTTPException(status_code=400, detail="Pairing code is required.")

    code_h = hash_code(raw_code)
    pairing_req = db.query(models.PairingRequest).filter(models.PairingRequest.code_hash == code_h).first()

    if not pairing_req:
        record_pairing_failure(rate_key)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pairing code is invalid or unavailable."
        )

    # Check already consumed
    if pairing_req.status == "CONSUMED":
        record_pairing_failure(rate_key)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PAIRING_CODE_ALREADY_USED: This pairing code has already been consumed. Please generate a new code on your laptop."
        )

    now = datetime.utcnow()
    # Check expired
    if pairing_req.status == "EXPIRED" or now > pairing_req.expires_at:
        pairing_req.status = "EXPIRED"
        db.commit()
        record_pairing_failure(rate_key)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PAIRING_CODE_EXPIRED: Pairing code expired. Please generate a fresh code on your laptop."
        )

    if pairing_req.status != "PENDING":
        record_pairing_failure(rate_key)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Pairing request is in '{pairing_req.status}' state and cannot be claimed."
        )

    # Specification: Strict User Email Binding
    if pairing_req.target_email:
        if current_user.email.strip().lower() != pairing_req.target_email.strip().lower():
            record_pairing_failure(rate_key)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This pairing code was issued specifically for {pairing_req.target_email}. You are signed in as {current_user.email}. Please sign in with {pairing_req.target_email} to pair this laptop."
            )

    # Transition to CLAIMED
    pairing_req.status = "CLAIMED"
    pairing_req.claimed_by_user_id = current_user.id
    clear_pairing_failures(rate_key)

    # Fetch device details
    device = db.query(models.ProtectedDevice).filter(models.ProtectedDevice.id == pairing_req.protected_device_id).first()

    # Audit log
    audit = models.AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        user_id=current_user.id,
        device_id=pairing_req.protected_device_id,
        action="PAIRING_CODE_CLAIMED",
        details_json=json.dumps({"request_id": pairing_req.id, "device_name": device.device_name if device else "Unknown"}),
        ip_address=client_ip,
        timestamp=now
    )
    db.add(audit)
    db.commit()

    rem_seconds = max(0, int((pairing_req.expires_at - now).total_seconds()))

    return {
        "pairing_request_id": pairing_req.id,
        "device_id": pairing_req.protected_device_id,
        "device_name": device.device_name if device else "Windows Laptop",
        "manufacturer": device.manufacturer if device else None,
        "model": device.model if device else None,
        "os_version": device.os_version if device else None,
        "status": "CLAIMED",
        "expires_in_seconds": rem_seconds
    }


@router.get("/status/{pairing_request_id}", response_model=schemas.PairingStatusResponse)
def get_pairing_status(
    pairing_request_id: str,
    db: Session = Depends(get_db)
):
    """
    Polled by Windows Sentinel to know when a user has claimed the code,
    so Sentinel can pop up the local confirmation prompt.
    """
    req = db.query(models.PairingRequest).filter(models.PairingRequest.id == pairing_request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Pairing request not found.")

    now = datetime.utcnow()
    if req.status == "PENDING" and now > req.expires_at:
        req.status = "EXPIRED"
        db.commit()

    claimed_email = None
    if req.claimed_by_user_id:
        user = db.query(models.User).filter(models.User.id == req.claimed_by_user_id).first()
        if user:
            claimed_email = mask_email(user.email)

    rem_seconds = max(0, int((req.expires_at - now).total_seconds()))

    return {
        "pairing_request_id": req.id,
        "status": req.status,
        "claimed_by_email": claimed_email,
        "claimed_by_user_id": req.claimed_by_user_id,
        "expires_in_seconds": rem_seconds
    }


@router.post("/confirm")
def confirm_pairing(
    confirm_in: schemas.PairingConfirmRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Called ONLY by Windows Sentinel after the owner locally clicks [APPROVE] on the laptop.
    Permanently consumes the pairing code and binds user to device ownership.
    """
    req = db.query(models.PairingRequest).filter(
        models.PairingRequest.id == confirm_in.pairing_request_id,
        models.PairingRequest.protected_device_id == confirm_in.device_id
    ).first()

    if not req:
        raise HTTPException(status_code=404, detail="Pairing request not found for this device.")

    if req.status == "CONSUMED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PAIRING_CODE_ALREADY_USED: Code already consumed."
        )

    if req.status != "CLAIMED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot confirm pairing in '{req.status}' state."
        )

    now = datetime.utcnow()
    if now > req.expires_at:
        req.status = "EXPIRED"
        db.commit()
        raise HTTPException(status_code=400, detail="PAIRING_CODE_EXPIRED: Pairing request timed out.")

    if not confirm_in.approved:
        # User clicked [DENY] locally on Windows Sentinel
        req.status = "DENIED"
        db.commit()
        return {"status": "DENIED", "message": "Pairing request was denied by the local user."}

    user_id = req.claimed_by_user_id
    if not user_id:
        raise HTTPException(status_code=400, detail="No user has claimed this pairing request.")

    # 1. Bind USER <-> DEVICE Ownership strictly (Specification Section 6)
    # Revoke any prior active ownership for this device to maintain 1 active owner rule
    prior_ownerships = db.query(models.DeviceOwnership).filter(
        models.DeviceOwnership.device_id == confirm_in.device_id,
        models.DeviceOwnership.revoked_at.is_(None)
    ).all()
    for po in prior_ownerships:
        po.revoked_at = now

    new_ownership = models.DeviceOwnership(
        id=f"own_{uuid.uuid4().hex[:12]}",
        user_id=user_id,
        device_id=confirm_in.device_id,
        role="OWNER",
        created_at=now
    )
    db.add(new_ownership)

    # 2. Mark device as Protected
    device = db.query(models.ProtectedDevice).filter(models.ProtectedDevice.id == confirm_in.device_id).first()
    if device:
        device.status = "Protected"
        device.last_seen = now

    # 3. Transition pairing code to CONSUMED permanently
    req.status = "CONSUMED"
    req.confirmed_at = now
    req.consumed_at = now

    # 4. FIRST CONTROLLER RULE (Specification Section 12):
    # Enroll the initial claiming controller as a trusted controller
    trusted_ctrl = db.query(models.TrustedController).filter(
        models.TrustedController.user_id == user_id,
        models.TrustedController.revoked_at.is_(None)
    ).first()
    if not trusted_ctrl:
        trusted_ctrl = models.TrustedController(
            id=f"ctrl_{uuid.uuid4().hex[:10]}",
            user_id=user_id,
            controller_type="MOBILE_APP",
            display_name="Primary Security Controller",
            created_at=now,
            last_used_at=now
        )
        db.add(trusted_ctrl)

    # 5. Audit Log
    audit = models.AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        user_id=user_id,
        device_id=confirm_in.device_id,
        action="PAIRING_APPROVED_AND_CONSUMED",
        details_json=json.dumps({"ownership_id": new_ownership.id, "request_id": req.id}),
        ip_address=request.client.host if request.client else None,
        timestamp=now
    )
    db.add(audit)
    db.commit()

    return {
        "status": "CONSUMED",
        "message": "Device successfully paired and owner bound.",
        "device_id": confirm_in.device_id,
        "owner_user_id": user_id
    }


@router.get("/device/{device_id}/status")
def get_device_pairing_status(
    device_id: str,
    db: Session = Depends(get_db)
):
    """
    Public device status endpoint for physical hardware agents (Windows Sentinel).
    Allows Sentinel to know if this hardware device is currently paired to an active owner.
    """
    device = db.query(models.ProtectedDevice).filter(models.ProtectedDevice.id == device_id).first()
    if not device:
        return {"device_id": device_id, "is_paired": False, "status": "Unpaired"}

    ownership = db.query(models.DeviceOwnership).filter(
        models.DeviceOwnership.device_id == device_id,
        models.DeviceOwnership.revoked_at.is_(None)
    ).first()

    return {
        "device_id": device.id,
        "device_name": device.device_name,
        "is_paired": ownership is not None,
        "status": device.status
    }
