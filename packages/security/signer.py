import hmac
import hashlib
import time
import uuid
import json
from typing import Dict, Any, Tuple

SECRET_SIGNING_KEY = b"laptopguard_device_secret_2026_super_secure_key"

def generate_command_envelope(command_type: str, device_id: str, user_id: str, payload: Dict[str, Any] = None) -> Dict[str, Any]:
    """Generates an authenticated, signed command envelope with nonce and expiration."""
    if payload is None:
        payload = {}
    
    command_id = f"cmd_{uuid.uuid4().hex[:12]}"
    nonce = uuid.uuid4().hex
    now = int(time.time())
    expires_at = now + 300  # Commands valid for 5 minutes with clock drift tolerance
    
    data_to_sign = f"{command_id}:{command_type}:{device_id}:{user_id}:{nonce}:{expires_at}:{json.dumps(payload, sort_keys=True)}"
    signature = hmac.new(SECRET_SIGNING_KEY, data_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
    
    return {
        "command_id": command_id,
        "command_type": command_type,
        "device_id": device_id,
        "user_id": user_id,
        "nonce": nonce,
        "created_at": now,
        "expires_at": expires_at,
        "payload": payload,
        "signature": signature
    }

def verify_command_envelope(envelope: Dict[str, Any]) -> Tuple[bool, str]:
    """Verifies that the command envelope is genuine, not expired, and not tampered with."""
    now = int(time.time())
    expires_at = envelope.get("expires_at")
    if expires_at and expires_at < (now - 300):
        return False, "Command has expired"
    
    command_id = envelope.get("command_id", "")
    command_type = envelope.get("command_type", "")
    device_id = envelope.get("device_id", "")
    user_id = envelope.get("user_id", "")
    nonce = envelope.get("nonce", "")
    expires_at = envelope.get("expires_at", 0)
    payload = envelope.get("payload", {})
    expected_sig = envelope.get("signature", "")
    
    data_to_sign = f"{command_id}:{command_type}:{device_id}:{user_id}:{nonce}:{expires_at}:{json.dumps(payload, sort_keys=True)}"
    calculated_sig = hmac.new(SECRET_SIGNING_KEY, data_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
    
    if not hmac.compare_digest(calculated_sig, expected_sig):
        return False, "Cryptographic signature mismatch"
        
    return True, "Valid"
