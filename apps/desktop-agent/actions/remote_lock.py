import ctypes
import os
import sys
import logging

logger = logging.getLogger("LaptopGuard.RemoteLock")

def lock_workstation() -> bool:
    """Executes native OS command to lock the workstation."""
    try:
        if sys.platform == "win32":
            logger.info("Calling Windows user32.LockWorkStation()...")
            result = ctypes.windll.user32.LockWorkStation()
            if result != 0:
                logger.info("Windows workstation successfully locked.")
                return True
            else:
                logger.error("Failed to lock Windows workstation.")
                return False
        elif sys.platform == "darwin":
            # macOS placeholder
            os.system('/System/Library/CoreServices/Menu\\ Extras/User.menu/Contents/Resources/CGSession -suspend')
            return True
        else:
            # Linux placeholder (xdg-screensaver or loginctl lock-session)
            os.system('loginctl lock-session || xdg-screensaver lock')
            return True
    except Exception as e:
        logger.error(f"Error locking workstation: {e}")
        return False
