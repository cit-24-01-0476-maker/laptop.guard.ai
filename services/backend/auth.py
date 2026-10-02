import hashlib
import hmac
import secrets
import jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from services.backend.config import settings
from services.backend.database import get_db
from services.backend import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    if hashed_password.startswith("pbkdf2_sha256$"):
        try:
            _, raw_iterations, raw_salt, expected = hashed_password.split("$", 3)
            calculated = hashlib.pbkdf2_hmac(
                "sha256",
                plain_password.encode("utf-8"),
                bytes.fromhex(raw_salt),
                int(raw_iterations),
            ).hex()
            return hmac.compare_digest(calculated, expected)
        except (TypeError, ValueError):
            return False

    # Accept legacy hashes long enough for existing accounts to sign in.
    legacy_salt = b"laptopguard_salt_2026"
    calculated = hashlib.pbkdf2_hmac(
        "sha256", plain_password.encode("utf-8"), legacy_salt, 100000
    ).hex()
    return hmac.compare_digest(calculated, hashed_password)

def get_password_hash(password: str) -> str:
    iterations = 310_000
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${digest.hex()}"

def get_pin_hash(pin: str) -> str:
    """Hash a master PIN with a unique salt before storing it."""
    iterations = 210_000
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${digest.hex()}"

def verify_pin(pin: str, stored_value: Optional[str]) -> bool:
    """Verify current PIN hashes and legacy plaintext PINs during migration."""
    if not stored_value:
        return False
    if not stored_value.startswith("pbkdf2_sha256$"):
        return hmac.compare_digest(pin, stored_value)
    try:
        _, raw_iterations, raw_salt, expected = stored_value.split("$", 3)
        calculated = hashlib.pbkdf2_hmac(
            "sha256", pin.encode("utf-8"), bytes.fromhex(raw_salt), int(raw_iterations)
        ).hex()
        return hmac.compare_digest(calculated, expected)
    except (TypeError, ValueError):
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    """Strictly validates authentication token. NO demo fallbacks or auto-logins."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token."
            )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or token expired.",
            headers={"WWW-Authenticate": "Bearer"}
        )
        
    user = db.query(models.User).filter(
        (models.User.id == user_id) | (models.User.email == user_id)
    ).first()

    if user is None:
        token_email = payload.get("email")
        if token_email:
            user = db.query(models.User).filter(models.User.email == token_email.strip().lower()).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists. Please sign out and sign in again."
        )
    return user

def get_optional_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Optional[models.User]:
    """Helper for endpoints that can conditionally behave based on auth state without failing."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id:
            return db.query(models.User).filter(models.User.id == user_id).first()
    except Exception:
        return None
    return None
