import time
import threading
import logging
import requests
import tkinter as tk
from typing import Optional, Callable

from config import BACKEND_HTTP_URL, DEVICE_ID

logger = logging.getLogger("LaptopGuard.CameraStreamer")

class CameraStreamer:
    def __init__(self, on_frame_callback: Optional[Callable] = None):
        self.is_streaming = False
        self.session_id: Optional[str] = None
        self.banner_window: Optional[tk.Tk] = None
        self.session_start_time: Optional[float] = None
        self.stream_thread: Optional[threading.Thread] = None
        self.device_id = DEVICE_ID

    def _show_privacy_indicator(self):
        """Displays visible on-screen camera-use indicator as mandated by privacy policy."""
        def run_banner():
            try:
                root = tk.Tk()
                self.banner_window = root
                root.title("LaptopGuard AI - Privacy Notice")
                root.attributes("-topmost", True)
                root.geometry("450x80+40+40")
                root.configure(bg="#0F172A")
                root.overrideredirect(True) # Borderless floating indicator

                frame = tk.Frame(root, bg="#0F172A", highlightbackground="#00E5FF", highlightthickness=2, padx=15, pady=10)
                frame.pack(expand=True, fill="both")

                lbl_title = tk.Label(
                    frame,
                    text="🔴 CAMERA IN USE BY LAPTOPGUARD AI",
                    font=("Helvetica", 11, "bold"),
                    fg="#FF2A55",
                    bg="#0F172A"
                )
                lbl_title.pack(anchor="w")

                lbl_sub = tk.Label(
                    frame,
                    text="Authorized remote live view active by device owner.",
                    font=("Helvetica", 9),
                    fg="#94A3B8",
                    bg="#0F172A"
                )
                lbl_sub.pack(anchor="w")

                root.mainloop()
            except Exception:
                pass

        indicator_thread = threading.Thread(target=run_banner, daemon=True)
        indicator_thread.start()

    def _hide_privacy_indicator(self):
        if self.banner_window:
            try:
                self.banner_window.destroy()
            except Exception:
                pass
            self.banner_window = None

    def _capture_loop(self):
        """Streaming loop with OpenCV, capturing frames and uploading to cloud relay."""
        cap = None
        upload_url = f"{BACKEND_HTTP_URL}/camera/frame/{self.device_id}"
        logger.info(f"Camera capture loop started -> Uploading to {upload_url}")

        try:
            import cv2
            cap = cv2.VideoCapture(0)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        except Exception as e:
            logger.warning(f"Could not open physical webcam: {e}")

        while self.is_streaming:
            now = time.time()
            elapsed = now - (self.session_start_time or now)
            if elapsed >= 300: # 5 minutes hard cap
                logger.warning("5-minute Live Camera session limit reached. Stopping stream.")
                self.stop_stream("SESSION_EXPIRED")
                break

            if cap is not None and cap.isOpened():
                try:
                    success, frame = cap.read()
                    if success:
                        import cv2
                        import datetime
                        ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        cv2.putText(frame, f"LAPTOPGUARD AI LIVE - {ts}", (15, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 229, 255), 2)
                        ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 65])
                        if ret:
                            try:
                                requests.post(
                                    upload_url,
                                    data=buffer.tobytes(),
                                    headers={"Content-Type": "image/jpeg"},
                                    timeout=2.0
                                )
                            except Exception:
                                pass
                except Exception as ex:
                    logger.debug(f"Frame capture error: {ex}")

            time.sleep(0.15) # ~6-7 FPS smooth stream

        if cap is not None:
            try:
                cap.release()
            except Exception:
                pass

    def start_stream(self, session_id: str = "live_session"):
        if self.is_streaming:
            return
        self.is_streaming = True
        self.session_id = session_id
        self.session_start_time = time.time()
        
        logger.info(f"Starting authorized Live Camera session {session_id}...")
        self._show_privacy_indicator()
        
        self.stream_thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.stream_thread.start()

    def stop_stream(self, reason: str = "USER_STOPPED"):
        if not self.is_streaming:
            return
        logger.info(f"Stopping Live Camera session ({reason}).")
        self.is_streaming = False
        self._hide_privacy_indicator()
        self.session_id = None

camera_streamer = CameraStreamer()
