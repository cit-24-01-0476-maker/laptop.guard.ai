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

def focus_pin_box():
    """Guarantees the PIN/Password text box has keyboard focus on Windows 10/11."""
    if sys.platform != "win32":
        return
    try:
        import ctypes
        user32 = ctypes.windll.user32

        w = user32.GetSystemMetrics(0)
        h = user32.GetSystemMetrics(1)
        # Windows 11 PIN / password entry field is positioned at horizontal center and ~58% vertical height
        cx = w // 2
        cy = int(h * 0.58)

        user32.SetCursorPos(cx, cy)
        time.sleep(0.05)
        # Left click down and up
        user32.mouse_event(0x0002, 0, 0, 0, 0)
        time.sleep(0.05)
        user32.mouse_event(0x0004, 0, 0, 0, 0)
        time.sleep(0.1)
        logger.info(f"Focused credential input box at ({cx}, {cy}).")
    except Exception as e:
        logger.error(f"Error focusing PIN box: {e}")

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

        # 1. Send Backspace 4 times to clear any space or stray characters inserted during swipe
        for _ in range(4):
            user32.keybd_event(VK_BACK, back_scan, 0, 0)
            user32.keybd_event(VK_BACK, back_scan, KEYEVENTF_KEYUP, 0)
            time.sleep(0.03)

        time.sleep(0.1)

        # 2. Type each character using real hardware scan codes + virtual keys
        for ch in text:
            vk_scan = user32.VkKeyScanW(ord(ch))
            if vk_scan != -1:
                vk = vk_scan & 0xFF
                shift_state = (vk_scan >> 8) & 1
                scan = user32.MapVirtualKeyW(vk, 0)

                if shift_state:
                    user32.keybd_event(VK_SHIFT, shift_scan, 0, 0)
                    time.sleep(0.03)

                user32.keybd_event(vk, scan, 0, 0)
                time.sleep(0.04)
                user32.keybd_event(vk, scan, KEYEVENTF_KEYUP, 0)
                time.sleep(0.03)

                if shift_state:
                    user32.keybd_event(VK_SHIFT, shift_scan, KEYEVENTF_KEYUP, 0)
                    time.sleep(0.02)
            else:
                # Fallback to Unicode event if character is unusual
                code = ord(ch)
                user32.keybd_event(0, code, KEYEVENTF_UNICODE, 0)
                user32.keybd_event(0, code, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP, 0)
                time.sleep(0.05)

            time.sleep(0.05)

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
    3. Waits 1.3s for lock screen swipe animation to finish.
    4. Clicks input box to guarantee keyboard focus.
    5. Types hardware-scancode credentials and submits Enter.
    """
    try:
        # Stop alarm if playing
        try:
            from actions.alarm_player import alarm_controller
            alarm_controller.stop_alarm()
        except Exception:
            pass

        logger.info(f"Executing remote unlock routine (Credential length: {len(pin_or_password) if pin_or_password else 0})...")
        wake_screen()

        if pin_or_password:
            # 1. Wait 1.3s for Windows lock screen swipe animation to finish
            logger.info("Waiting 1.3s for lock screen slide animation to settle...")
            time.sleep(1.3)

            # 2. Click PIN box to guarantee focus
            focus_pin_box()

            # 3. Inject hardware keystrokes
            inject_hardware_keystrokes(pin_or_password)

        logger.info("Remote workstation unlock routine completed successfully.")
        return True
    except Exception as e:
        logger.error(f"Failed to execute remote workstation unlock: {e}")
        return False
