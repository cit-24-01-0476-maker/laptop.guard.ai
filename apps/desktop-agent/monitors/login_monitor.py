import logging
from typing import Optional, Callable, Dict, Any

logger = logging.getLogger("LaptopGuard.LoginMonitor")

class LoginMonitor:
    def __init__(self, on_login_event: Optional[Callable[[str, str, Dict[str, Any]], None]] = None):
        self.on_login_event = on_login_event
        self.failed_attempts_count = 0

    def record_failed_login(self, is_armed: bool):
        self.failed_attempts_count += 1
        logger.warning(f"Failed login attempt registered (Count: {self.failed_attempts_count})")
        if self.on_login_event and is_armed:
            severity = "WARNING" if self.failed_attempts_count < 3 else "CRITICAL"
            self.on_login_event(
                "FAILED_LOGIN",
                severity,
                {
                    "message": f"{self.failed_attempts_count} failed sign-in attempt(s) detected.",
                    "attempt_count": self.failed_attempts_count
                }
            )

    def reset_failed_attempts(self):
        self.failed_attempts_count = 0
