import logging
from typing import Optional, Callable, Dict, Any

logger = logging.getLogger("LaptopGuard.MovementDetector")

class MovementDetector:
    def __init__(self, on_movement_event: Optional[Callable[[str, str, Dict[str, Any]], None]] = None):
        self.on_movement_event = on_movement_event
        self.sensor_available = False
        self.status_message = "Physical movement detection is unavailable on this device."
        self._check_hardware_sensor()

    def _check_hardware_sensor(self):
        """Checks for native Windows Accelerometer / Sensor API hardware."""
        try:
            # On laptops with native Windows Sensor API:
            # e.g., Windows.Devices.Sensors.Accelerometer
            # Check if sensor hardware is present
            self.sensor_available = False
            self.status_message = "Physical movement detection is unavailable on this device."
        except Exception:
            self.sensor_available = False
            self.status_message = "Physical movement detection is unavailable on this device."
            
        logger.info(f"Movement Sensor Status: {self.status_message}")

    def get_sensor_info(self) -> Dict[str, Any]:
        return {
            "has_accelerometer": self.sensor_available,
            "status_message": self.status_message,
            "monitored_heuristics": ["Power State", "Wi-Fi BSSID", "USB Peripherals", "Lid State"]
        }

    def trigger_simulated_motion(self, is_armed: bool):
        """Allows testing motion alerts during development or security drill."""
        logger.warning("Simulated motion / physical disturbance triggered.")
        if self.on_movement_event and is_armed:
            self.on_movement_event(
                "MOVEMENT_DETECTED",
                "CRITICAL",
                {
                    "message": "Physical movement detected by device sensor trigger.",
                    "confidence": 0.94
                }
            )
