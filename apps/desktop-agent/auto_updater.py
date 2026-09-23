"""
LaptopGuard AI - Desktop Auto-Updater Module
Provides Over-The-Air (OTA) automated self-updating for Windows Sentinel.
- Checks /api/v1/downloads/manifest periodically and on demand
- Downloads latest compiled binary in background
- Seamlessly applies update via background batch script and restarts
"""

import os
import sys
import time
import logging
import threading
import subprocess
from pathlib import Path
from typing import Callable, Optional
import requests

logger = logging.getLogger("LaptopGuard.Updater")

APP_VERSION = "1.4.2"
UPDATE_INTERVAL_SECONDS = 1800  # Check every 30 minutes


def is_version_newer(latest: str, current: str) -> bool:
    """Returns True if latest is strictly newer than current semantic version."""
    try:
        def parse(v):
            return [int(x) for x in v.strip().lstrip("v").split(".") if x.isdigit()]
        return parse(latest) > parse(current)
    except Exception:
        return latest.strip().lstrip("v") != current.strip().lstrip("v")


class DesktopAutoUpdater:
    def __init__(self, backend_url: str = "https://laptopguard-api.onrender.com", on_status: Optional[Callable[[str], None]] = None):
        self.backend_url = backend_url.rstrip("/")
        if not self.backend_url.startswith("http"):
            self.backend_url = f"https://{self.backend_url}"
        self.on_status = on_status
        self.is_checking = False
        self.is_downloading = False

    def notify(self, message: str):
        logger.info(f"[Updater] {message}")
        if self.on_status:
            try:
                self.on_status(message)
            except Exception:
                pass

    def check_for_updates(self, manual: bool = False):
        if self.is_checking or self.is_downloading:
            return

        def _worker():
            self.is_checking = True
            try:
                if manual:
                    self.notify("Checking cloud for latest software version...")

                manifest_url = f"{self.backend_url}/api/v1/downloads/manifest"
                res = requests.get(manifest_url, timeout=8)
                if res.status_code == 200:
                    data = res.json()
                    latest = data.get("latest_version", APP_VERSION)
                    if is_version_newer(latest, APP_VERSION):
                        self.notify(f"✨ New version v{latest} available! Initiating background update...")
                        self._download_and_apply(latest, data)
                    else:
                        if manual:
                            self.notify(f"✅ Software is up-to-date (v{APP_VERSION}).")
                else:
                    if manual:
                        self.notify(f"Update check server response: {res.status_code}")
            except Exception as e:
                logger.debug(f"Update check failed: {e}")
                if manual:
                    self.notify(f"Update check could not reach cloud hub.")
            finally:
                self.is_checking = False

        threading.Thread(target=_worker, daemon=True).start()

    def _download_and_apply(self, new_version: str, manifest: dict):
        if self.is_downloading:
            return
        self.is_downloading = True

        def _download_worker():
            try:
                exe_url = manifest.get("download_urls", {}).get("windows_exe", "/downloads/windows-exe")
                if not exe_url.startswith("http"):
                    exe_url = f"{self.backend_url}{exe_url}"

                temp_dir = Path(os.environ.get("TEMP", os.environ.get("LOCALAPPDATA", ".")))
                new_exe = temp_dir / f"LaptopGuard_v{new_version}.exe"

                self.notify(f"📥 Downloading LaptopGuard AI v{new_version} in background...")
                with requests.get(exe_url, stream=True, timeout=120) as r:
                    r.raise_for_status()
                    total_bytes = 0
                    with open(new_exe, "wb") as f:
                        for chunk in r.iter_content(chunk_size=1024 * 1024):
                            if chunk:
                                f.write(chunk)
                                total_bytes += len(chunk)

                if not new_exe.exists() or new_exe.stat().st_size < 1_000_000:
                    self.notify("⚠️ Download verification failed. Will retry later.")
                    self.is_downloading = False
                    return

                size_mb = round(total_bytes / (1024 * 1024), 1)
                self.notify(f"✅ Downloaded v{new_version} ({size_mb} MB). Applying update...")

                # If running as compiled .exe, replace and restart
                if getattr(sys, "frozen", False):
                    current_exe = Path(sys.executable).resolve()
                    bat_path = temp_dir / "apply_laptopguard_update.bat"

                    bat_content = f"""@echo off
title Updating LaptopGuard AI...
timeout /t 2 /nobreak > nul
:retry
copy /y "{new_exe}" "{current_exe}" > nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 1 /nobreak > nul
    goto retry
)
del "{new_exe}" > nul 2>&1
start "" "{current_exe}"
del "%~f0" > nul 2>&1
exit
"""
                    with open(bat_path, "w") as f:
                        f.write(bat_content)

                    self.notify("Restarting LaptopGuard AI to complete automatic update...")
                    time.sleep(1.5)
                    creation_flags = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
                    subprocess.Popen(["cmd.exe", "/c", str(bat_path)], shell=True, creationflags=creation_flags)
                    os._exit(0)
                else:
                    self.notify(f"Update package v{new_version} verified at {new_exe}.")
            except Exception as e:
                logger.error(f"Error during auto update: {e}")
                self.notify(f"Auto-update error: {e}")
            finally:
                self.is_downloading = False

        threading.Thread(target=_download_worker, daemon=True).start()

    def start_background_checker(self):
        """Starts a persistent daemon thread that checks every 30 minutes."""
        def _loop():
            # Initial delay after app launch so network initializes
            time.sleep(15)
            while True:
                self.check_for_updates(manual=False)
                time.sleep(UPDATE_INTERVAL_SECONDS)

        t = threading.Thread(target=_loop, daemon=True)
        t.start()
