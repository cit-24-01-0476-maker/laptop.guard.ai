import time
import urllib.request
import cv2
import datetime
import subprocess
import socket
import re

DEVICE_ID = "dev_oshadhaperera_925a94"
FRAME_URL = f"https://laptopguard-api.onrender.com/api/v1/camera/frame/{DEVICE_ID}"

def get_network_info():
    ssid = "Oshadha's A56"
    ip = "192.168.1.12"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass

    try:
        out = subprocess.check_output(["netsh", "wlan", "show", "interfaces"], encoding="utf-8", errors="ignore")
        m = re.search(r"^\s*SSID\s*:\s*(.+)$", out, re.MULTILINE)
        if m:
            clean_ssid = m.group(1).strip()
            if clean_ssid:
                ssid = clean_ssid
    except Exception:
        pass

    return ssid, ip

def run_streamer():
    print(f"[WEBCAM SENTINEL] Initializing persistent physical webcam stream for {DEVICE_ID}...")
    
    ssid, local_ip = get_network_info()
    last_net_check = time.time()
    
    cap = None
    failures = 0

    while True:
        try:
            if cap is None or not cap.isOpened():
                cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
                if not cap.isOpened():
                    cap = cv2.VideoCapture(0)
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

            ret, frame = cap.read()
            if not ret or frame is None:
                failures += 1
                if failures > 5:
                    if cap:
                        cap.release()
                    cap = None
                    failures = 0
                    time.sleep(2)
                else:
                    time.sleep(0.4)
                continue

            failures = 0

            # Refresh network info every 30 seconds
            if time.time() - last_net_check > 30:
                ssid, local_ip = get_network_info()
                last_net_check = time.time()

            # Add professional Sentinel security watermark overlay on the frame
            ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            h, w = frame.shape[:2]
            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 0), (w, 36), (15, 23, 42), -1)
            cv2.rectangle(overlay, (0, h - 28), (w, h), (15, 23, 42), -1)
            cv2.addWeighted(overlay, 0.68, frame, 0.32, 0, frame)

            cv2.putText(frame, f"DELL G15 5530 • SENTINEL CAM • {ts}", (12, 23),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 229, 255), 1, cv2.LINE_AA)
            cv2.putText(frame, "● LIVE HARDWARE FEED", (w - 225, 23),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.44, (16, 185, 129), 1, cv2.LINE_AA)
            cv2.putText(frame, f"DEVICE: DELL G15 • WIFI: {ssid} • IP: {local_ip}", (12, h - 9),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.38, (203, 213, 225), 1, cv2.LINE_AA)

            # Encode to JPEG
            _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 74])
            frame_data = buf.tobytes()

            req = urllib.request.Request(
                FRAME_URL,
                data=frame_data,
                headers={'Content-Type': 'image/jpeg'}
            )
            with urllib.request.urlopen(req, timeout=4) as resp:
                pass

            time.sleep(0.75) # Continuous live feed (~1.3 fps)
        except Exception as e:
            # Network glitch or timeout — retry quietly and maintain loop
            time.sleep(1.0)

if __name__ == "__main__":
    run_streamer()
