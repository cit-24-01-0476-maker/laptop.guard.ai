import os
import uuid
import json
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from services.backend.config import settings, EVIDENCE_DIR
from services.backend.database import get_db
from services.backend import models, schemas
from services.backend.auth import get_current_user
from services.backend.policy import authorize_device_action, get_controller_from_request

router = APIRouter(prefix="/evidence", tags=["Evidence Vault"])

@router.get("", response_model=List[schemas.EvidenceResponse])
def list_evidence(
    device_id: Optional[str] = None,
    file_type: Optional[str] = None,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Specification Section 30: Evidence Access Control.
    Lists only evidence for protected devices actively owned by authenticated user.
    """
    # Find all active owned device IDs for user
    ownerships = db.query(models.DeviceOwnership).filter(
        models.DeviceOwnership.user_id == current_user.id,
        models.DeviceOwnership.revoked_at.is_(None)
    ).all()
    owned_device_ids = [o.device_id for o in ownerships]

    if not owned_device_ids:
        return []

    query = db.query(models.EvidenceFile).filter(models.EvidenceFile.device_id.in_(owned_device_ids))
    if device_id:
        if device_id not in owned_device_ids:
            return []
        query = query.filter(models.EvidenceFile.device_id == device_id)
    if file_type:
        query = query.filter(models.EvidenceFile.file_type == file_type.upper())
        
    return query.order_by(models.EvidenceFile.created_at.desc()).all()

@router.post("/upload")
async def upload_evidence(
    device_id: str = Form(...),
    file_type: str = Form("SNAPSHOT"),
    trigger_event: str = Form("AUTHORIZED_SNAPSHOT"),
    retention_days: int = Form(7),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Receives forensic evidence files from the Sentinel agent on protected device."""
    device = db.query(models.ProtectedDevice).filter(models.ProtectedDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found.")

    device_folder = EVIDENCE_DIR / device_id
    device_folder.mkdir(parents=True, exist_ok=True)
    
    file_id = f"evi_{uuid.uuid4().hex[:12]}"
    filename = f"{file_id}_{file.filename}"
    file_path = device_folder / filename
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
        
    now = datetime.utcnow()
    expires_at = now + timedelta(days=retention_days) if retention_days > 0 else None
    
    evidence_obj = models.EvidenceFile(
        id=file_id,
        device_id=device_id,
        file_type=file_type.upper(),
        file_name=file.filename,
        file_path=str(file_path),
        file_size=len(content),
        trigger_event=trigger_event,
        retention_days=retention_days,
        is_encrypted=True,
        expires_at=expires_at,
        created_at=now
    )
    db.add(evidence_obj)
    device.last_seen = now
    db.commit()
    db.refresh(evidence_obj)
    
    return {"status": "success", "evidence_id": file_id}

@router.get("/file/{evidence_id}")
def get_evidence_file(
    evidence_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    IDOR/BOLA Protection: Resolves evidence, resolves device, checks device ownership
    and trusted controller authorization before returning file content.
    """
    evidence = db.query(models.EvidenceFile).filter(models.EvidenceFile.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found.")

    controller = get_controller_from_request(request, current_user, db)
    authorize_device_action(
        db, current_user, evidence.device_id, action="EVIDENCE_DOWNLOAD", controller=controller
    )

    if not os.path.exists(evidence.file_path):
        raise HTTPException(status_code=404, detail="File content not found on disk.")
        
    return FileResponse(evidence.file_path, filename=evidence.file_name)

@router.delete("/{evidence_id}")
def delete_evidence(
    evidence_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    evidence = db.query(models.EvidenceFile).filter(models.EvidenceFile.id == evidence_id).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found.")

    controller = get_controller_from_request(request, current_user, db)
    authorize_device_action(
        db, current_user, evidence.device_id, action="EVIDENCE_DELETE", controller=controller
    )

    if os.path.exists(evidence.file_path):
        try:
            os.remove(evidence.file_path)
        except Exception:
            pass

    audit = models.AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        user_id=current_user.id,
        device_id=evidence.device_id,
        action="EVIDENCE_DELETED",
        details_json=json.dumps({"evidence_id": evidence.id, "file_name": evidence.file_name}),
        ip_address=request.client.host if request.client else None,
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.delete(evidence)
    db.commit()
    return {"status": "success", "message": "Evidence permanently deleted."}
