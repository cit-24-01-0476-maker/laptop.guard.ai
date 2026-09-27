import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from services.backend.database import get_db
from services.backend import models, schemas
from services.backend.auth import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.TokenResponse)
def register(user_in: schemas.UserCreate, request: Request, db: Session = Depends(get_db)):
    clean_email = (user_in.email or "").strip().lower()
    clean_password = (user_in.password or "").strip()
    full_name = (user_in.full_name or clean_email.split("@")[0]).strip().title()

    if not clean_email or not clean_password:
        raise HTTPException(status_code=400, detail="Email and password cannot be empty.")

    if len(clean_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    clean_secret_pin = (getattr(user_in, 'secret_pin', None) or "6728").strip()

    existing = db.query(models.User).filter(func.lower(models.User.email) == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please sign in."
        )

    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    user = models.User(
        id=user_id,
        email=clean_email,
        password_hash=get_password_hash(clean_password),
        full_name=full_name,
        role="owner",
        two_factor_enabled=True,
        two_factor_secret=clean_secret_pin
    )
    db.add(user)
    
    # Audit log
    audit = models.AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        user_id=user_id,
        action="ACCOUNT_REGISTERED",
        details_json="{}",
        ip_address=request.client.host if request.client else None,
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()
    db.refresh(user)

    # Initial controller tracking (Untrusted by default until explicitly enrolled or paired)
    controller_id = f"ctrl_{uuid.uuid4().hex[:10]}"
    access_token = create_access_token(data={"sub": user.id, "email": user.email, "cid": controller_id})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "controller_id": controller_id,
        "is_controller_trusted": False, # New accounts start with ZERO trusted controllers
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "two_factor_enabled": user.two_factor_enabled
        }
    }

@router.post("/login", response_model=schemas.TokenResponse)
def login(login_data: schemas.UserLogin, request: Request, db: Session = Depends(get_db)):
    clean_email = (login_data.email or "").strip().lower()
    clean_password = (login_data.password or "").strip()

    if not clean_email or not clean_password:
        raise HTTPException(status_code=400, detail="Email and password cannot be empty.")

    user = db.query(models.User).filter(func.lower(models.User.email) == clean_email).first()
    if not user or not verify_password(clean_password, user.password_hash):
        # Audit failed login
        if user:
            audit = models.AuditLog(
                id=f"aud_{uuid.uuid4().hex[:12]}",
                user_id=user.id,
                action="LOGIN_FAILED",
                details_json="{\"reason\": \"invalid_password\"}",
                ip_address=request.client.host if request.client else None,
                timestamp=datetime.utcnow()
            )
            db.add(audit)
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # Resolve controller status from header or passed name
    req_controller_id = request.headers.get("x-controller-id")
    controller = None
    if req_controller_id:
        controller = db.query(models.TrustedController).filter(
            models.TrustedController.id == req_controller_id,
            models.TrustedController.user_id == user.id,
            models.TrustedController.revoked_at.is_(None)
        ).first()

    controller_id = controller.id if controller else (req_controller_id or f"ctrl_{uuid.uuid4().hex[:10]}")
    is_trusted = controller is not None and controller.revoked_at is None

    # Audit successful login
    audit = models.AuditLog(
        id=f"aud_{uuid.uuid4().hex[:12]}",
        user_id=user.id,
        action="LOGIN_SUCCESS",
        details_json=f"{{\"controller_id\": \"{controller_id}\", \"is_trusted\": {str(is_trusted).lower()}}}",
        ip_address=request.client.host if request.client else None,
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()

    access_token = create_access_token(data={"sub": user.id, "email": user.email, "cid": controller_id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "controller_id": controller_id,
        "is_controller_trusted": is_trusted,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "two_factor_enabled": user.two_factor_enabled
        }
    }

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user
