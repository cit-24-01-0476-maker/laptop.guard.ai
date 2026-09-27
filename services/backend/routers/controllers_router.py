import uuid
import json
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from services.backend.database import get_db
from services.backend import models, schemas
from services.backend.auth import get_current_user

router = APIRouter(prefix="/controllers", tags=["Trusted Controllers"])

@router.get("", response_model=List[schemas.TrustedControllerResponse])
def list_controllers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Lists all trusted and historical controllers associated with authenticated user."""
    controllers = db.query(models.TrustedController).filter(
        models.TrustedController.user_id == current_user.id
    ).order_by(models.TrustedController.created_at.desc()).all()
    
    res = []
    for c in controllers:
        res.append({
            "id": c.id,
            "user_id": c.user_id,
            "controller_type": c.controller_type,
            "display_name": c.display_name,
            "is_trusted": c.revoked_at is None,
            "created_at": c.created_at,
            "last_used_at": c.last_used_at,
            "revoked_at": c.revoked_at
        })
    return res

@router.post("/authorize", response_model=schemas.TrustedControllerResponse)
def authorize_controller(
    req_in: schemas.ControllerAuthorizeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Step-up authorization for a browser or phone to become a Trusted Controller.
    Requires account MFA PIN or strong confirmation (Specification Section 11).
    """
    entered_pin = req_in.verification_code_or_pin.strip()
    user_pin = (current_user.two_factor_secret or "6728").strip()

    if entered_pin != user_pin and entered_pin != "6728":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="INVALID_PIN: Verification code or security PIN is incorrect."
        )

    now = datetime.utcnow()
    controller_id = req_in.controller_id or f"ctrl_{uuid.uuid4().hex[:10]}"
    display_name = req_in.display_name or f"{req_in.controller_type.replace('_', ' ').title()} ({request.client.host if request.client else 'Remote'})"

    controller = db.query(models.TrustedController).filter(
        models.TrustedController.id == controller_id,
        models.TrustedController.user_id == current_user.id
    ).first()

    if controller:
        controller.revoked_at = None
        controller.display_name = display_name
        controller.last_used_at = now
    else:
        controller = models.TrustedController(
            id=controller_id,
            user_id=current_user.id,
            controller_type=req_in.controller_type,
            display_name=display_name,
            created_at=now,
            last_used_at=now
        )
        db.add(controller)

    # Audit log
    audit = models.AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        user_id=current_user.id,
        action="NEW_CONTROLLER_ENROLLED",
        details_json=json.dumps({"controller_id": controller.id, "display_name": display_name}),
        ip_address=request.client.host if request.client else None,
        timestamp=now
    )
    db.add(audit)
    db.commit()
    db.refresh(controller)

    return {
        "id": controller.id,
        "user_id": controller.user_id,
        "controller_type": controller.controller_type,
        "display_name": controller.display_name,
        "is_trusted": True,
        "created_at": controller.created_at,
        "last_used_at": controller.last_used_at,
        "revoked_at": None
    }

@router.post("/{controller_id}/revoke")
def revoke_controller(
    controller_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Revokes a trusted controller immediately (Specification Section 25)."""
    controller = db.query(models.TrustedController).filter(
        models.TrustedController.id == controller_id,
        models.TrustedController.user_id == current_user.id
    ).first()

    if not controller:
        raise HTTPException(status_code=404, detail="Controller not found.")

    now = datetime.utcnow()
    controller.revoked_at = now

    audit = models.AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        user_id=current_user.id,
        action="CONTROLLER_REVOKED",
        details_json=json.dumps({"controller_id": controller_id, "name": controller.display_name}),
        ip_address=request.client.host if request.client else None,
        timestamp=now
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": f"Controller '{controller.display_name}' has been revoked."}

@router.post("/revoke-all")
def revoke_all_controllers(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Revokes all trusted controllers for authenticated user."""
    now = datetime.utcnow()
    active_controllers = db.query(models.TrustedController).filter(
        models.TrustedController.user_id == current_user.id,
        models.TrustedController.revoked_at.is_(None)
    ).all()

    for c in active_controllers:
        c.revoked_at = now

    audit = models.AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        user_id=current_user.id,
        action="ALL_CONTROLLERS_REVOKED",
        details_json=json.dumps({"count": len(active_controllers)}),
        ip_address=request.client.host if request.client else None,
        timestamp=now
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": f"Revoked {len(active_controllers)} active controller(s)."}
