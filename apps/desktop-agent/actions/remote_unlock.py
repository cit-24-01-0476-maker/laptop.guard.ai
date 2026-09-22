import sys
import time
import logging
from typing import Optional

logger = logging.getLogger("LaptopGuard.RemoteUnlock")

def wake_screen():
    """Wakes the Windows display and dismisses the lock screen wallpaper overlay."""
    if sys.platform != "win32":
        return
    try:
        import ctypes
        user32 = ctypes.windll.user32

        # 1. Subtle mouse nudge to wake display from low-power state
        user32.mouse_event(0x0001, 1, 1, 0, 0)
        time.sleep(0.05)
        user32.mouse_event(0x0001, -1, -1, 0, 0)
        time.sleep(0.15)

        # 2. Press Spacebar (0x20) to lift the lock screen cover image
        VK_SPACE = 0x20
        KEYEVENTF_KEYUP = 0x0002
        user32.keybd_event(VK_SPACE, 0, 0, 0)
        user32.keybd_event(VK_SPACE, 0, KEYEVENTF_KEYUP, 0)
        logger.info("Sent wake screen and dismiss wallpaper events.")
    except Exception as e:
        logger.error(f"Error waking display: {e}")

def inject_keystrokes(text: str):
    """Injects unicode keystrokes and presses Enter to authenticate into Windows."""
    if sys.platform != "win32" or not text:
        return
    try:
        import ctypes
        user32 = ctypes.windll.user32

        KEYEVENTF_KEYUP = 0x0002
        KEYEVENTF_UNICODE = 0x0004
        VK_RETURN = 0x0D

        # Type each character cleanly using Windows Unicode input
        for ch in text:
            code = ord(ch)
            user32.keybd_event(0, code, KEYEVENTF_UNICODE, 0)
            user32.keybd_event(0, code, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP, 0)
            time.sleep(0.03)

        # Small pause before Enter
        time.sleep(0.1)

        # Press Enter key to submit PIN/Password
        user32.keybd_event(VK_RETURN, 0, 0, 0)
        user32.keybd_event(VK_RETURN, 0, KEYEVENTF_KEYUP, 0)
        logger.info("Typed remote credential and submitted Enter key.")
    except Exception as e:
        logger.error(f"Error injecting keystrokes: {e}")

def unlock_workstation(pin_or_password: Optional[str] = None) -> bool:
    """
    Executes remote biometric unlock routine:
    1. Stops any security alarm if ringing.
    2. Wakes display and brings up Windows PIN/Password box.
    3. Types credentials if supplied.
    """
    try:
        # Stop alarm if playing
        try:
            from actions.alarm_player import alarm_controller
            alarm_controller.stop_alarm()
        except Exception:
            pass

        logger.info("Executing remote unlock routine...")
        wake_screen()

        if pin_or_password:
            # Wait 0.3s for PIN box to gain focus after spacebar
            time.sleep(0.35)
            inject_keystrokes(pin_or_password)

        logger.info("Remote workstation unlock routine completed successfully.")
        return True
    except Exception as e:
        logger.error(f"Failed to execute remote workstation unlock: {e}")
        return False
