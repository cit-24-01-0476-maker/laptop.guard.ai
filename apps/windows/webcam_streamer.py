import time
import urllib.request
import cv2
import datetime

DEVICE_ID = "dev_oshadhaperera_925a94"
FRAME_URL = f"https://laptopguard-api.onrender.com/api/v1/camera/frame/{DEVICE_ID}"

def run_streamer():
    print(f"[WEBCAM SENTINEL] Starting real physical webcam capture for {DEVICE_ID}...")
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[WEBCAM SENTINEL] Warning: Camera 0 not opened, retrying in 5s...")
        time.sleep(5)
        cap = cv2.VideoCapture(0)

    # Set resolution
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    failures = 0
    while True:
        try:
            if not cap.isOpened():
                cap = cv2.VideoCapture(0)
                time.sleep(1)
                continue

            ret, frame = cap.read()
            if not ret or frame is None:
                failures += 1
                if failures > 10:
                    cap.release()
                    time.sleep(2)
                    cap = cv2.VideoCapture(0)
                    failures = 0
                time.sleep(0.5)
                continue

            failures = 0

            # Add professional Sentinel security watermark overlay on the frame
            ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            # Semi-transparent top bar
            h, w = frame.shape[:2]
            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 0), (w, 36), (15, 23, 42), -1)
            cv2.rectangle(overlay, (0, h - 28), (w, h), (15, 23, 42), -1)
            cv2.addWeighted(overlay, 0.65, frame, 0.35, 0, frame)

            cv2.putText(frame, f"LAPTOPGUARD AI • LIVE WEBCAM • {ts}", (12, 23),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 229, 255), 1, cv2.LINE_AA)
            cv2.putText(frame, "● LIVE SENTINEL SURVEILLANCE", (w - 240, 23),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (16, 185, 129), 1, cv2.LINE_AA)
            cv2.putText(frame, "DEVICE: OSHADHAPERERA • WIFI: SLT-Fiber-tysZ8-5G • IP: 192.168.1.12", (12, h - 9),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (203, 213, 225), 1, cv2.LINE_AA)

            # Encode to JPEG
            _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 72])
            frame_data = buf.tobytes()

            req = urllib.request.Request(
                FRAME_URL,
                data=frame_data,
                headers={'Content-Type': 'image/jpeg'}
            )
            with urllib.request.urlopen(req, timeout=4) as resp:
                pass

            time.sleep(0.8) # ~1.25 FPS continuous live updates
        except Exception as e:
            # Network glitch or timeout — retry quietly
            time.sleep(1.5)

if __name__ == "__main__":
    run_streamer()
