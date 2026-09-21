import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "database" / "laptopguard.db"
EVIDENCE_DIR = BASE_DIR / "evidence_vault"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

class Settings:
    PROJECT_NAME: str = "LaptopGuard AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = os.getenv("LAPTOPGUARD_SECRET_KEY", "prod_laptopguard_secret_2026_jwt_token_sign_key")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ALGORITHM: str = "HS256"
    
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
