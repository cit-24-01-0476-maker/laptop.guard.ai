import hashlib
import os
import secrets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "database" / "laptopguard.db"
EVIDENCE_DIR = BASE_DIR / "evidence_vault"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

class Settings:
    PROJECT_NAME: str = "LaptopGuard AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Production deployments should set LAPTOPGUARD_SECRET_KEY. A fresh random
    # fallback is safer than shipping one universal key with every installation.
    SECRET_KEY: str = os.getenv("LAPTOPGUARD_SECRET_KEY") or secrets.token_urlsafe(64)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALGORITHM: str = "HS256"
    OWNER_ACCESS_KEY_HASH: str = os.getenv(
        "LAPTOPGUARD_OWNER_ACCESS_KEY_HASH",
        "5a7be5d6adf69ee6dbab9815494679c65bb96269451bd7c3ff2fc94532a6548b",
    )
    ALLOWED_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "LAPTOPGUARD_ALLOWED_ORIGINS",
            "https://laptopguardai.vercel.app,https://laptop.guard.ai,capacitor://localhost,ionic://localhost,http://localhost,http://127.0.0.1,http://127.0.0.1:5173,http://127.0.0.1:5177,http://localhost:5173,http://localhost:5177",
        ).split(",")
        if origin.strip()
    ]
    ALLOWED_ORIGIN_REGEX: str | None = os.getenv(
        "LAPTOPGUARD_ALLOWED_ORIGIN_REGEX",
        r"^https://([a-z0-9-]+\.)*vercel\.app$|^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^(capacitor|ionic)://localhost$",
    )
    
    # SQLite default, or PostgreSQL if DATABASE_URL is set
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
    
    # WebRTC STUN/TURN Servers
    ICE_SERVERS = [
        {"urls": "stun:stun.l.google.com:19302"},
        {"urls": "stun:stun1.l.google.com:19302"},
        {"urls": "stun:stun2.l.google.com:19302"},
        {"urls": "stun:stun.cloudflare.com:3478"}
    ]
    
    # Camera Session constraints
    CAMERA_SESSION_MAX_DURATION_SECONDS: int = 300  # 5 minutes max session
    CAMERA_SESSION_WARNING_SECONDS: int = 240       # Warn at 4 minutes (60 seconds left)

settings = Settings()

def hash_owner_key(value: str) -> str:
    clean_value = "".join((value or "").split()).upper()
    return hashlib.sha256(clean_value.encode("utf-8")).hexdigest()
