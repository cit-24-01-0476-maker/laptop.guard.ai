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

        # 1. Mouse nudge to wake display from low-power state
        user32.mouse_event(0x0001, 1, 1, 0, 0)
        time.sleep(0.05)
        user32.mouse_event(0x0001, -1, -1, 0, 0)
        time.sleep(0.1)

        # 2. Press Spacebar (0x20) and UP arrow (0x26) to reliably dismiss the lock screen wallpaper overlay
        VK_SPACE = 0x20
        VK_UP = 0x26
        KEYEVENTF_KEYUP = 0x0002

        space_scan = user32.MapVirtualKeyW(VK_SPACE, 0)
        user32.keybd_event(VK_SPACE, space_scan, 0, 0)
        user32.keybd_event(VK_SPACE, space_scan, KEYEVENTF_KEYUP, 0)
        time.sleep(0.1)

        up_scan = user32.MapVirtualKeyW(VK_UP, 0)
        user32.keybd_event(VK_UP, up_scan, 0, 0)
        user32.keybd_event(VK_UP, up_scan, KEYEVENTF_KEYUP, 0)

        logger.info("Sent wake screen and dismiss wallpaper events (Space + Up).")
    except Exception as e:
        logger.error(f"Error waking display: {e}")

def inject_hardware_keystrokes(text: str):
    """
    Injects authentic hardware-level virtual key codes and scan codes into Windows LogonUI.
    Works for PINs, complex passwords, numbers, uppercase/lowercase letters, and symbols.
    """
    if sys.platform != "win32" or not text:
        return
    try:
        import ctypes
        user32 = ctypes.windll.user32

        KEYEVENTF_KEYUP = 0x0002
        KEYEVENTF_UNICODE = 0x0004
        VK_SHIFT = 0x10
        VK_RETURN = 0x0D
        VK_BACK = 0x08

        shift_scan = user32.MapVirtualKeyW(VK_SHIFT, 0)
        back_scan = user32.MapVirtualKeyW(VK_BACK, 0)
        enter_scan = user32.MapVirtualKeyW(VK_RETURN, 0)

        # 1. Send Backspace 3 times to clear any space or stray characters inserted during swipe
        for _ in range(3):
            user32.keybd_event(VK_BACK, back_scan, 0, 0)
            user32.keybd_event(VK_BACK, back_scan, KEYEVENTF_KEYUP, 0)
            time.sleep(0.03)

        time.sleep(0.08)

        # 2. Type each character using real hardware scan codes + virtual keys
        for ch in text:
            vk_scan = user32.VkKeyScanW(ord(ch))
            if vk_scan != -1:
                vk = vk_scan & 0xFF
                shift_state = (vk_scan >> 8) & 1
                scan = user32.MapVirtualKeyW(vk, 0)

                if shift_state:
                    user32.keybd_event(VK_SHIFT, shift_scan, 0, 0)
                    time.sleep(0.02)

                user32.keybd_event(vk, scan, 0, 0)
                time.sleep(0.03)
                user32.keybd_event(vk, scan, KEYEVENTF_KEYUP, 0)
                time.sleep(0.02)

                if shift_state:
                    user32.keybd_event(VK_SHIFT, shift_scan, KEYEVENTF_KEYUP, 0)
                    time.sleep(0.02)
            else:
                # Fallback to Unicode event if character is unusual
                code = ord(ch)
                user32.keybd_event(0, code, KEYEVENTF_UNICODE, 0)
                user32.keybd_event(0, code, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP, 0)
                time.sleep(0.04)

            time.sleep(0.04)

        # 3. Pause before submitting Enter
        time.sleep(0.2)

        # 4. Press Enter key to submit credentials
        user32.keybd_event(VK_RETURN, enter_scan, 0, 0)
        user32.keybd_event(VK_RETURN, enter_scan, KEYEVENTF_KEYUP, 0)
        time.sleep(0.4)
        # Repeat Enter once to ensure submission on Windows PIN screen
        user32.keybd_event(VK_RETURN, enter_scan, 0, 0)
        user32.keybd_event(VK_RETURN, enter_scan, KEYEVENTF_KEYUP, 0)

        logger.info(f"Typed {len(text)} credential keystrokes and submitted Enter.")
    except Exception as e:
        logger.error(f"Error injecting hardware keystrokes: {e}")

def unlock_workstation(pin_or_password: Optional[str] = None) -> bool:
    """
    Executes remote biometric unlock routine:
    1. Stops any security alarm if ringing.
    2. Wakes display and brings up Windows PIN/Password box.
    3. Waits 1.2s for lock screen swipe animation to finish.
    4. Types hardware-scancode credentials and submits Enter.
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
            # Crucial: Wait 1.2s for Windows lock screen swipe animation to finish and focus password field
            logger.info("Waiting 1.2s for lock screen slide animation to focus input field...")
            time.sleep(1.2)
            inject_hardware_keystrokes(pin_or_password)

        logger.info("Remote workstation unlock routine completed successfully.")
        return True
    except Exception as e:
        logger.error(f"Failed to execute remote workstation unlock: {e}")
        return False
