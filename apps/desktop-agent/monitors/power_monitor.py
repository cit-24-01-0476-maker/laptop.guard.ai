import psutil
import logging
import ctypes
from ctypes import wintypes
from typing import Optional, Callable, Dict, Any

logger = logging.getLogger("LaptopGuard.PowerMonitor")

class SYSTEM_POWER_STATUS(ctypes.Structure):
    _fields_ = [
        ('ACLineStatus', wintypes.BYTE),       # 0: Offline, 1: Online, 255: Unknown
        ('BatteryFlag', wintypes.BYTE),
        ('BatteryLifePercent', wintypes.BYTE), # 0-100, 255: Unknown
        ('SystemStatusFlag', wintypes.BYTE),
        ('BatteryLifeTime', wintypes.DWORD),
        ('BatteryFullLifeTime', wintypes.DWORD),
    ]

class PowerMonitor:
    def __init__(self, on_power_event: Optional[Callable[[str, str, Dict[str, Any]], None]] = None):
        self.on_power_event = on_power_event
        self.last_charging: Optional[bool] = None
        self.last_battery_pct: Optional[int] = None

    def _get_windows_ac_status(self) -> Optional[bool]:
        """Queries Windows Win32 kernel32.GetSystemPowerStatus directly."""
        try:
            status = SYSTEM_POWER_STATUS()
            res = ctypes.windll.kernel32.GetSystemPowerStatus(ctypes.byref(status))
            if res:
                # 0 = Offline/Unplugged, 1 = Online/Plugged in
                if status.ACLineStatus == 0:
                    return False
                elif status.ACLineStatus == 1:
                    return True
        except Exception as e:
            logger.debug(f"Win32 GetSystemPowerStatus error: {e}")
        return None
        
    def check_power_state(self, is_armed: bool):
        try:
            # 1. First priority: Windows native GetSystemPowerStatus (instantaneous)
            win_ac = self._get_windows_ac_status()
            
            # 2. Secondary fallback: psutil
            battery = psutil.sensors_battery()
            percent = int(battery.percent) if battery else 100
            is_plugged = win_ac if win_ac is not None else (bool(battery.power_plugged) if battery else True)
            
            if self.last_charging is None:
                self.last_charging = is_plugged
                self.last_battery_pct = percent
                logger.info(f"Power baseline established: Plugged={is_plugged}, Percent={percent}%, Armed={is_armed}")
                return {
                    "battery_percent": percent,
                    "is_charging": is_plugged,
                    "power_plugged": is_plugged
                }

            if self.last_charging != is_plugged:
                logger.info(f"Power state transition detected: {self.last_charging} -> {is_plugged} (Armed: {is_armed})")
                if not is_plugged and is_armed:
                    # Power disconnected while armed -> CRITICAL security warning
                    logger.warning("ALERT: AC power cable disconnected while device is armed!")
                    if self.on_power_event:
                        self.on_power_event(
                            "POWER_DISCONNECT",
                            "CRITICAL",
                            {
                                "message": "AC power cable was disconnected while device was armed.",
                                "battery_percent": percent
                            }
                        )
                elif not is_plugged and not is_armed:
                    logger.info("Power cable disconnected while device is DISARMED (Security alarm bypassed).")
                    if self.on_power_event:
                        self.on_power_event(
                            "POWER_DISCONNECT",
                            "WARNING",
                            {
                                "message": "AC power cable disconnected while device is DISARMED (Arm device to activate deterrence siren).",
                                "battery_percent": percent
                            }
                        )
                elif is_plugged:
                    logger.info("Power cable reconnected.")
                    if self.on_power_event:
                        self.on_power_event(
                            "POWER_CONNECTED",
                            "INFO",
                            {
                                "message": "AC power cable reconnected.",
                                "battery_percent": percent
                            }
                        )
            
            self.last_charging = is_plugged
            self.last_battery_pct = percent
            
            return {
                "battery_percent": percent,
                "is_charging": is_plugged,
                "power_plugged": is_plugged
            }
        except Exception as e:
            logger.error(f"Error checking power state: {e}")
            return {"battery_percent": 100, "is_charging": True, "power_plugged": True}
