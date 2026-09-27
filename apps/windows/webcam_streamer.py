import time
import urllib.request
import json
import cv2
import datetime
import subprocess
import socket
import re
import os
import threading
import ctypes
from PIL import ImageGrab
import psutil

DEVICE_ID = "dev_oshadhaperera_925a94"
BASE_URL = "https://laptopguard-api.onrender.com/api/v1"
FRAME_URL = f"{BASE_URL}/camera/frame/{DEVICE_ID}"
SCREEN_URL = f"{BASE_URL}/screen/frame/{DEVICE_ID}"
EVENT_URL = f"{BASE_URL}/events/report"
STATUS_URL = f"{BASE_URL}/devices/{DEVICE_ID}/status"

MODEL_PATH = os.path.join(os.path.dirname(__file__), "face_detection_yunet_2023mar.onnx")

# Global state
g_is_armed = True
g_current_ssid = "Oshadha's A56 😂"
g_local_ip = "192.168.1.12"
g_trusted_ssids = {"Oshadha's A56 😂", "Oshadha's A56"}
last_face_alert_time = 0
last_usb_alert_time = 0
last_geofence_alert_time = 0

def attach_to_desktop():
    """Attaches background thread to user's interactive desktop winsta0\\default."""
    try:
        user32 = ctypes.windll.user32
        hwinsta = user32.OpenWindowStationW('winsta0', False, 0x037F)
        if hwinsta:
            user32.SetProcessWindowStation(hwinsta)
            hdesk = user32.OpenDesktopW('default', 0, False, 0x01FF)
            if hdesk:
                user32.SetThreadDesktop(hdesk)
    except Exception as e:
        pass

def lock_workstation():
    """Locks Windows workstation instantly."""
    try:
        ctypes.windll.user32.LockWorkStation()
    except Exception:
        pass

def report_security_event(event_type: str, severity: str, description: str, metadata: dict = None):
    """Sends real-time security alert event to cloud API, which notifies phone via WebSocket."""
    try:
        payload = json.dumps({
            "device_id": DEVICE_ID,
            "event_type": event_type,
            "severity": severity,
            "description": description,
            "metadata_json": json.dumps(metadata or {})
        }).encode('utf-8')
        req = urllib.request.Request(
            EVENT_URL,
            data=payload,
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            pass
        print(f"[SENTINEL ALERT] Dispatched {event_type} ({severity}): {description}")
    except Exception as e:
        print(f"[ALERT ERROR] Failed to dispatch event {event_type}: {e}")

def get_network_info():
    ssid = "Oshadha's A56 😂"
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

def screen_mirror_worker():
    """Captures and streams live Windows desktop screen to the cloud."""
    attach_to_desktop()
    print("[SCREEN SENTINEL] Live Remote Screen Mirror thread started.")

    while True:
        try:
            attach_to_desktop()
            # Capture display screen
            img = ImageGrab.grab()
            if img:
                # Resize for lightweight fast mobile streaming
                img = img.resize((854, 480))
                # Convert to bytes
                import io
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=65)
                screen_bytes = buf.getvalue()

                req = urllib.request.Request(
                    SCREEN_URL,
                    data=screen_bytes,
                    headers={'Content-Type': 'image/jpeg'}
                )
                with urllib.request.urlopen(req, timeout=4) as resp:
                    pass

            time.sleep(1.2) # ~1 fps screen mirror
        except Exception:
            time.sleep(1.5)

def watchdog_security_worker():
    """Monitors Wi-Fi Geofence and USB Intruder Trap continuously."""
    global g_is_armed, g_current_ssid, g_local_ip, g_trusted_ssids
    global last_usb_alert_time, last_geofence_alert_time

    print("[WATCHDOG SENTINEL] Smart Wi-Fi Geofence & USB Anti-Theft Trap active.")
    
    # Establish baseline disk drives
    known_drives = set()
    try:
        for p in psutil.disk_partitions(all=True):
            known_drives.add(p.device)
    except Exception:
        pass

    # Baseline trusted SSIDs
    ssid, ip = get_network_info()
    g_current_ssid = ssid
    g_local_ip = ip
    g_trusted_ssids.add(ssid)

    while True:
        try:
            # 1. Check armed status from cloud every 10 seconds
            try:
                with urllib.request.urlopen(STATUS_URL, timeout=4) as r:
                    status_data = json.loads(r.read())
                    g_is_armed = bool(status_data.get("is_armed", True))
            except Exception:
                pass

            # 2. Check Wi-Fi Geofence
            current_ssid, current_ip = get_network_info()
            g_current_ssid = current_ssid
            g_local_ip = current_ip

            if g_is_armed and current_ssid not in g_trusted_ssids and "disconnected" in current_ssid.lower():
                now = time.time()
                if now - last_geofence_alert_time > 30:
                    last_geofence_alert_time = now
                    print(f"[GEOFENCE] Breach detected! Disconnected from trusted Wi-Fi: {current_ssid}")
                    lock_workstation()
                    report_security_event(
                        "GEOFENCE_BREACH",
                        "CRITICAL",
                        f"Laptop disconnected from trusted Wi-Fi hotspot '{list(g_trusted_ssids)[0]}'. Auto-lock triggered!",
                        {"ssid": current_ssid, "trusted": list(g_trusted_ssids)}
                    )

            # 3. Check USB Anti-Theft Trap (BadUSB / unauthorized drive arrival)
            current_drives = set()
            for p in psutil.disk_partitions(all=True):
                current_drives.add(p.device)

            new_drives = current_drives - known_drives
            if new_drives:
                for drive in new_drives:
                    print(f"[USB TRAP] New drive detected: {drive}")
                    if g_is_armed:
                        now = time.time()
                        if now - last_usb_alert_time > 20:
                            last_usb_alert_time = now
                            lock_workstation()
                            report_security_event(
                                "UNAUTHORIZED_USB_INSERTED",
                                "CRITICAL",
                                f"Unauthorized USB storage drive {drive} plugged in while armed! Workstation locked.",
                                {"drive": drive}
                            )
                known_drives = current_drives

            time.sleep(2.0)
        except Exception:
            time.sleep(3.0)

def webcam_and_ai_face_worker():
    """Captures live webcam, executes YuNet Face Detection, overlays HUD, and streams frames."""
    global g_is_armed, g_current_ssid, g_local_ip, last_face_alert_time

    print(f"[WEBCAM SENTINEL] Initializing physical webcam & AI Face Intruder Detection for {DEVICE_ID}...")

    # Initialize YuNet face detector if ONNX model is available
    face_detector = None
    if os.path.exists(MODEL_PATH):
        try:
            face_detector = cv2.FaceDetectorYN.create(
                model=MODEL_PATH,
                config='',
                input_size=(640, 480),
                score_threshold=0.6,
                nms_threshold=0.3,
                top_k=10
            )
            print("[AI FACE] YuNet Neural Face Detector loaded successfully!")
        except Exception as e:
            print(f"[AI FACE WARNING] Could not load YuNet model: {e}")

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
            h, w = frame.shape[:2]

            # AI Face Detection
            face_count = 0
            if face_detector:
                try:
                    face_detector.setInputSize((w, h))
                    _, faces = face_detector.detect(frame)
                    if faces is not None and len(faces) > 0:
                        face_count = len(faces)
                        for face in faces:
                            fx, fy, fw, fh = map(int, face[:4])
                            confidence = float(face[-1])
                            # Draw futuristic Cyber Intruder HUD bounding box
                            cv2.rectangle(frame, (fx, fy), (fx + fw, fy + fh), (0, 0, 255), 2)
                            cv2.rectangle(frame, (fx, fy - 22), (fx + fw, fy), (0, 0, 255), -1)
                            cv2.putText(frame, f"INTRUDER FACE {int(confidence*100)}%", (fx + 4, fy - 6),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1, cv2.LINE_AA)

                        # If laptop is Armed, report Intruder Face Alert to owner
                        if g_is_armed:
                            now = time.time()
                            if now - last_face_alert_time > 25:
                                last_face_alert_time = now
                                report_security_event(
                                    "INTRUDER_FACE_DETECTED",
                                    "CRITICAL",
                                    f"AI Sentinel detected human face in front of laptop while armed! ({face_count} face(s))",
                                    {"confidence": float(faces[0][-1]), "face_count": face_count}
                                )
                except Exception as e:
                    pass

            # Add professional Sentinel security watermark overlay on the frame
            ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 0), (w, 36), (15, 23, 42), -1)
            cv2.rectangle(overlay, (0, h - 28), (w, h), (15, 23, 42), -1)
            cv2.addWeighted(overlay, 0.68, frame, 0.32, 0, frame)

            status_tag = "● FACE DETECTED" if face_count > 0 else "● LIVE HARDWARE FEED"
            tag_color = (0, 0, 255) if face_count > 0 else (16, 185, 129)

            cv2.putText(frame, f"DELL G15 5530 • SENTINEL CAM • {ts}", (12, 23),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.48, (0, 229, 255), 1, cv2.LINE_AA)
            cv2.putText(frame, status_tag, (w - 230, 23),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.44, tag_color, 1, cv2.LINE_AA)
            cv2.putText(frame, f"DELL G15 • WIFI: {g_current_ssid} • IP: {g_local_ip} • FACES: {face_count}", (12, h - 9),
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
        except Exception:
            time.sleep(1.0)

def main():
    print("[SENTINEL MASTER] Starting All-In-One LaptopGuard AI Sentinel Engine...")
    
    # Start Screen Mirroring thread
    t_screen = threading.Thread(target=screen_mirror_worker, daemon=True)
    t_screen.start()

    # Start Wi-Fi Geofence & USB Watchdog thread
    t_watchdog = threading.Thread(target=watchdog_security_worker, daemon=True)
    t_watchdog.start()

    # Main thread runs Webcam & AI Face Detection
    webcam_and_ai_face_worker()

if __name__ == "__main__":
    main()
