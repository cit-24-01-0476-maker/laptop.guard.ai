import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Device configuration
DEVICE_ID = os.getenv("LAPTOPGUARD_DEVICE_ID", "dev_oska_xps15")
# Cloud Backend URLs (Render) with localhost fallback
BACKEND_HTTP_URL = os.getenv("LAPTOPGUARD_API_URL", "https://laptopguard-api.onrender.com/api/v1")
BACKEND_WS_URL = os.getenv("LAPTOPGUARD_WS_URL", "wss://laptopguard-api.onrender.com/ws")

LOCAL_QUEUE_FILE = BASE_DIR / "offline_events.enc.json"
SECRET_KEY = b"laptopguard_device_secret_2026_super_secure_key"
