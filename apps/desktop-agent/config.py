import os
from pathlib import Path

try:
    from identity import get_or_create_device_identity
except ImportError:
    try:
        from apps.desktop_agent.identity import get_or_create_device_identity
    except ImportError:
        def get_or_create_device_identity():
            return {
                "device_id": os.getenv("LAPTOPGUARD_DEVICE_ID", "dev_sentinel_pc"),
                "device_name": os.getenv("LAPTOPGUARD_DEVICE_NAME", "Windows Sentinel"),
                "manufacturer": "PC",
                "model": "Laptop"
            }

BASE_DIR = Path(__file__).resolve().parent

# Dynamic, permanent hardware identity
_identity = get_or_create_device_identity()
DEVICE_ID = os.getenv("LAPTOPGUARD_DEVICE_ID", _identity.get("device_id", "dev_sentinel_pc"))
DEVICE_NAME = os.getenv("LAPTOPGUARD_DEVICE_NAME", _identity.get("device_name", "Windows Sentinel"))
MANUFACTURER = _identity.get("manufacturer", "PC")
MODEL = _identity.get("model", "Laptop")

# Cloud Backend URLs (Render) with localhost fallback
BACKEND_HTTP_URL = os.getenv("LAPTOPGUARD_API_URL", "https://laptopguard-api.onrender.com/api/v1")
BACKEND_WS_URL = os.getenv("LAPTOPGUARD_WS_URL", "wss://laptopguard-api.onrender.com/ws")

LOCAL_QUEUE_FILE = BASE_DIR / "offline_events.enc.json"
SECRET_KEY = b"laptopguard_device_secret_2026_super_secure_key"
