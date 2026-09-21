import subprocess
import socket
import logging
import psutil
from typing import Optional, Callable, Dict, Any

logger = logging.getLogger("LaptopGuard.NetworkMonitor")

class NetworkMonitor:
    def __init__(self, on_network_event: Optional[Callable[[str, str, Dict[str, Any]], None]] = None):
        self.on_network_event = on_network_event
        self.last_ssid: Optional[str] = None
        self.last_ip: Optional[str] = None
        self.last_connected: bool = True

    def get_current_wifi_ssid(self) -> Optional[str]:
        """Queries Windows netsh for the current Wi-Fi SSID."""
        try:
            output = subprocess.check_output(
                ["netsh", "wlan", "show", "interfaces"],
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                timeout=3
            )
            for line in output.splitlines():
                if "SSID" in line and "BSSID" not in line:
                    parts = line.split(":", 1)
                    if len(parts) == 2:
                        ssid = parts[1].strip()
                        if ssid:
                            return ssid
        except Exception:
            pass
        return None

    def get_local_ip(self) -> str:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.settimeout(0.5)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "127.0.0.1"

    def check_network_state(self, is_armed: bool) -> Dict[str, Any]:
        current_ssid = self.get_current_wifi_ssid() or "Ethernet / Local Network"
        current_ip = self.get_local_ip()
        is_connected = current_ip != "127.0.0.1"

        if self.last_connected and not is_connected:
            logger.warning("Internet connection lost.")
            if self.on_network_event and is_armed:
                self.on_network_event(
                    "WIFI_CHANGED",
                    "WARNING",
                    {"message": "Internet connectivity lost while armed.", "previous_ssid": self.last_ssid}
                )
        elif not self.last_connected and is_connected:
            logger.info("Internet connection restored.")

        if self.last_ssid is not None and self.last_ssid != current_ssid and is_connected:
            logger.warning(f"Wi-Fi network changed from '{self.last_ssid}' to '{current_ssid}'.")
            if self.on_network_event and is_armed:
                self.on_network_event(
                    "WIFI_CHANGED",
                    "WARNING",
                    {
                        "message": f"Device connected to a different network: '{current_ssid}'",
                        "previous_ssid": self.last_ssid,
                        "new_ssid": current_ssid
                    }
                )

        self.last_ssid = current_ssid
        self.last_ip = current_ip
        self.last_connected = is_connected

        return {
            "current_ssid": current_ssid,
            "ip_address": current_ip,
            "is_connected": is_connected
        }
