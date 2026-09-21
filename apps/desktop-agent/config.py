import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Device configuration
DEVICE_ID = os.getenv("LAPTOPGUARD_DEVICE_ID", "dev_oska_xps15")
DEVICE_NAME = os.getenv("LAPTOPGUARD_DEVICE_NAME", "Oska Laptop")
BACKEND_HTTP_URL = os.getenv("LAPTOPGUARD_API_URL", "http://localhost:8000/api/v1")
BACKEND_WS_URL = os.getenv("LAPTOPGUARD_WS_URL", "ws://localhost:8000/ws")

LOCAL_QUEUE_FILE = BASE_DIR / "offline_events.enc.json"
SECRET_KEY = b"laptopguard_device_secret_2026_super_secure_key"
