import sys
import time
import threading
import logging
import tkinter as tk
from typing import Optional, Callable

logger = logging.getLogger("LaptopGuard.Alarm")

def unmute_and_boost_volume():
    """Unmutes Windows audio and boosts output level for security alarm."""
    try:
        import ctypes
        user32 = ctypes.windll.user32
        VK_VOLUME_UP = 0xAF
        for _ in range(25):
            user32.keybd_event(VK_VOLUME_UP, 0, 0, 0)
            user32.keybd_event(VK_VOLUME_UP, 0, 2, 0)
    except Exception:
        pass

class AlarmController:
    def __init__(self, on_state_change: Optional[Callable[[bool], None]] = None):
        self.is_playing = False
        self.alarm_thread: Optional[threading.Thread] = None
        self.alert_window: Optional[tk.Tk] = None
        self.on_state_change = on_state_change
        self.max_duration_seconds = 15  # Auto-timeout after 15s to prevent continuous endless noise

    def _beep_loop(self):
        unmute_and_boost_volume()
        start_time = time.time()
        logger.info(f"Siren sound loop started (Auto-timeout limit: {self.max_duration_seconds}s)")
        
        while self.is_playing:
            # Auto-timeout check: stop after 15 seconds
            elapsed = time.time() - start_time
            if elapsed >= self.max_duration_seconds:
                logger.info(f"Siren auto-timeout reached ({elapsed:.1f}s). Silencing alarm automatically.")
                break

            try:
                if sys.platform == "win32":
                    import winsound
                    if not self.is_playing:
                        break
                    try:
                        winsound.Beep(2500, 200)
                    except Exception:
                        winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)
                    time.sleep(0.04)
                    
                    if not self.is_playing:
                        break
                    try:
                        winsound.Beep(1800, 200)
                    except Exception:
                        winsound.MessageBeep(-1)
                    time.sleep(0.04)
                else:
                    if not self.is_playing:
                        break
                    print("\a", flush=True)
                    time.sleep(0.4)
            except Exception as e:
                logger.error(f"Siren error: {e}")
                time.sleep(0.5)

        # When loop completes (either timeout or stopped), cleanly stop
        self.stop_alarm()

    def _show_alert_screen(self):
        """Displays prominent, non-destructive security alert screen with dismiss button."""
        def run_gui():
            root = tk.Tk()
            self.alert_window = root
            root.title("LaptopGuard AI - Security Alert")
            root.attributes("-topmost", True)
            root.geometry("620x440")
            root.configure(bg="#0B0F19")
            
            # Prevent closing by standard X without pressing Stop button
            root.protocol("WM_DELETE_WINDOW", self.stop_alarm)

            frame = tk.Frame(root, bg="#0B0F19", padx=30, pady=30)
            frame.pack(expand=True, fill="both")

            title_lbl = tk.Label(
                frame,
                text="🛡️ LAPTOPGUARD AI",
                font=("Helvetica", 16, "bold"),
                fg="#00E5FF",
                bg="#0B0F19"
            )
            title_lbl.pack(pady=(0, 10))

            alert_lbl = tk.Label(
                frame,
                text="SECURITY ALERT ACTIVE",
                font=("Helvetica", 22, "bold"),
                fg="#FF2A55",
                bg="#0B0F19"
            )
            alert_lbl.pack(pady=5)

            msg_lbl = tk.Label(
                frame,
                text="Security alert active on this device.\nAudible deterrence siren is playing.\nAuto-silence timer: 15 seconds.",
                font=("Helvetica", 12),
                fg="#E2E8F0",
                bg="#0B0F19",
                justify="center"
            )
            msg_lbl.pack(pady=15)

            lost_lbl = tk.Label(
                frame,
                text="Click below or use the Web Dashboard to silence the siren.",
                font=("Helvetica", 10, "italic"),
                fg="#94A3B8",
                bg="#0B0F19"
            )
            lost_lbl.pack(pady=(0, 20))

            stop_btn = tk.Button(
                frame,
                text="⏹️ STOP ALARM / SILENCE SIREN",
                font=("Helvetica", 13, "bold"),
                bg="#FF2A55",
                fg="#FFFFFF",
                activebackground="#D91B42",
                activeforeground="#FFFFFF",
                relief="flat",
                padx=25,
                pady=12,
                cursor="hand2",
                command=self.stop_alarm
            )
            stop_btn.pack(pady=10)

            root.mainloop()

        gui_thread = threading.Thread(target=run_gui, daemon=True)
        gui_thread.start()

    def play_alarm(self, duration: int = 15):
        self.max_duration_seconds = duration or 15
        self.start_alarm()

    def start_alarm(self):
        if self.is_playing:
            return
        self.is_playing = True
        logger.warning("Starting security alarm siren (max 15s auto-timeout)...")
        
        if self.on_state_change:
            try:
                self.on_state_change(True)
            except Exception as e:
                logger.error(f"Error in alarm state callback: {e}")

        self.alarm_thread = threading.Thread(target=self._beep_loop, daemon=True)
        self.alarm_thread.start()
        
        self._show_alert_screen()

    def stop_alarm(self):
        if not self.is_playing and not self.alert_window:
            return
        logger.info("Stopping security alarm and silencing siren.")
        self.is_playing = False
        
        if self.on_state_change:
            try:
                self.on_state_change(False)
            except Exception as e:
                logger.error(f"Error in alarm state callback: {e}")

        if self.alert_window:
            try:
                self.alert_window.after(0, self.alert_window.destroy)
            except Exception:
                try:
                    self.alert_window.destroy()
                except Exception:
                    pass
            self.alert_window = None

alarm_controller = AlarmController()
