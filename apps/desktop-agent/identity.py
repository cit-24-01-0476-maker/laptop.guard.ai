import os
import sys
import json
import hashlib
import platform
from pathlib import Path

CONFIG_DIR = Path.home() / ".laptopguard"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)
IDENTITY_FILE = CONFIG_DIR / "device_identity.json"

def get_machine_guid() -> str:
    """Read Windows MachineGuid from registry or fallback to node."""
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography") as k:
            guid, _ = winreg.QueryValueEx(k, "MachineGuid")
            if guid:
                return str(guid).strip()
    except Exception:
        pass
    return f"{platform.node()}_{platform.machine()}"

def get_system_model() -> tuple:
    """Retrieve manufacturer and model if possible."""
    manufacturer = "Windows PC"
    model = "Laptop"
    try:
        import subprocess
        out = subprocess.check_output(
            ["powershell", "-NoProfile", "-Command", "Get-CimInstance Win32_ComputerSystem | Select-Object -Property Manufacturer,Model | ConvertTo-Json"],
            timeout=3,
            creationflags=0x08000000 if os.name == "nt" else 0
        ).decode().strip()
        data = json.loads(out)
        if isinstance(data, dict):
            manufacturer = data.get("Manufacturer", manufacturer)
            model = data.get("Model", model)
    except Exception:
        pass
    return manufacturer, model

def get_or_create_device_identity() -> dict:
    """
    Returns persistent hardware identity for this laptop.
    Ensures that every laptop running LaptopGuard has a distinct, permanent device_id.
    """
    if IDENTITY_FILE.exists():
        try:
            with open(IDENTITY_FILE, "r") as f:
                data = json.load(f)
                # Verify it has valid non-hardcoded device_id
                if data.get("device_id") and data.get("device_id") != "dev_oska_xps15":
                    return data
        except Exception:
            pass

    guid = get_machine_guid()
    comp_name = os.environ.get("COMPUTERNAME", platform.node()) or "Laptop"
    raw_id = f"laptopguard_{guid}_{comp_name}"
    dev_hash = hashlib.sha256(raw_id.encode("utf-8")).hexdigest()[:12]
    device_id = f"dev_{dev_hash}"

    manufacturer, model = get_system_model()
    device_name = f"{model} Sentinel" if model and model != "Laptop" else f"{comp_name} Sentinel"

    identity = {
        "device_id": device_id,
        "device_name": device_name,
        "manufacturer": manufacturer,
        "model": model,
        "os": "Windows",
        "os_version": platform.release(),
        "computer_name": comp_name
    }

    try:
        with open(IDENTITY_FILE, "w") as f:
            json.dump(identity, f, indent=2)
    except Exception:
        pass

    return identity
