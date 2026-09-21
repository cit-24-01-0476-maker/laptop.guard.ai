import sqlite3
import os
import hashlib
import uuid
from datetime import datetime, timedelta

def get_db_path():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "laptopguard.db")

def hash_password(password: str) -> str:
    # PBKDF2 with SHA-256 for deterministic seed verification
    salt = b"laptopguard_salt_2026"
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000).hex()

def seed_database():
    db_path = get_db_path()
    schema_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "schema.sql")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Execute schema
    with open(schema_path, "r", encoding="utf-8") as f:
        cursor.executescript(f.read())
        
    print(f"Database schema initialized at {db_path}")
    
    # Check if already seeded
    cursor.execute("SELECT COUNT(*) FROM users WHERE email = ?", ("oska@laptopguard.ai",))
    if cursor.fetchone()[0] > 0:
        print("Database already contains seed data.")
        conn.close()
        return

    now = datetime.utcnow()
    user_id = "usr_" + uuid.uuid4().hex[:12]
    device_id = "dev_oska_xps15"
    pwd_hash = hash_password("SecurityPass2026!")

    # 1. Insert User
    cursor.execute("""
        INSERT INTO users (id, email, password_hash, full_name, role, two_factor_enabled, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (user_id, "oska@laptopguard.ai", pwd_hash, "Oska Perera", "owner", 1, now - timedelta(days=30)))

    # 2. Insert Primary Device: Oska Laptop
    cursor.execute("""
        INSERT INTO devices (
            id, user_id, device_name, device_type, manufacturer, model,
            os, os_version, agent_version, device_public_key, is_paired,
            status, security_mode, battery, is_charging, current_ssid,
            ip_address, last_seen, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        device_id, user_id, "Oska Laptop", "laptop", "Dell Inc.", "XPS 15 9530",
        "Windows", "Windows 11 Pro 23H2 (Build 22631)", "1.4.2", "ed25519_pk_7f8a9b2c3d4e5f6a",
        1, "Protected", "Balanced", 82, 0, "Campus_Secure_5G",
        "192.168.1.142", now, now - timedelta(days=20)
    ))

    # 3. Secondary Demo Device: MacBook Air (Authorized Backup)
    mac_id = "dev_macbook_air_m2"
    cursor.execute("""
        INSERT INTO devices (
            id, user_id, device_name, device_type, manufacturer, model,
            os, os_version, agent_version, device_public_key, is_paired,
            status, security_mode, battery, is_charging, current_ssid,
            ip_address, last_seen, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        mac_id, user_id, "Work MacBook Air", "laptop", "Apple", "MacBook Air M2",
        "macOS", "macOS Sonoma 14.5", "1.4.2", "ed25519_pk_apple_98f12a",
        1, "Disarmed", "Low", 95, 1, "Home_Office_Wi-Fi",
        "192.168.0.45", now - timedelta(hours=3), now - timedelta(days=10)
    ))

    # 4. Device Locations
    loc_id = "loc_" + uuid.uuid4().hex[:10]
    cursor.execute("""
        INSERT INTO device_locations (id, device_id, latitude, longitude, accuracy_meters, method, city, region, country, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (loc_id, device_id, 1.2966, 103.7764, 180.0, "wifi_triangulation", "Singapore", "Queenstown", "Singapore", now - timedelta(minutes=4)))

    # 5. Security Events Timeline
    events = [
        (device_id, "ARMED", "INFO", "Laptop armed in Balanced Security Mode via Mobile App.", loc_id, None, now - timedelta(hours=2, minutes=15)),
        (device_id, "POWER_DISCONNECT", "WARNING", "AC power cable disconnected while device was armed.", loc_id, None, now - timedelta(hours=1, minutes=20)),
        (device_id, "MOVEMENT_DETECTED", "CRITICAL", "Physical position disturbance registered by acceleration threshold.", loc_id, None, now - timedelta(minutes=42)),
        (device_id, "WIFI_CHANGED", "WARNING", "Network switched from 'Campus_Secure_5G' to 'Library_Guest_Open'.", loc_id, None, now - timedelta(minutes=40)),
        (device_id, "REMOTE_LOCK", "INFO", "Remote lock command confirmed and executed via Windows user32.LockWorkStation.", loc_id, None, now - timedelta(minutes=38)),
        (device_id, "ALARM_TRIGGERED", "CRITICAL", "High-frequency deterrence siren sounded remotely by verified owner.", loc_id, None, now - timedelta(minutes=36)),
    ]
    for ev in events:
        cursor.execute("""
            INSERT INTO security_events (id, device_id, event_type, severity, description, location_id, evidence_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, ("ev_" + uuid.uuid4().hex[:10], ev[0], ev[1], ev[2], ev[3], ev[4], ev[5], ev[6]))

    # 6. Notifications
    notifs = [
        (user_id, device_id, "High Priority: Movement Detected", "Oska Laptop registered physical motion at National University Library.", "CRITICAL", 0, now - timedelta(minutes=42)),
        (user_id, device_id, "Network Changed", "Oska Laptop connected to 'Library_Guest_Open'.", "WARNING", 0, now - timedelta(minutes=40)),
        (user_id, device_id, "Power Disconnected", "AC power adapter unplugged.", "WARNING", 1, now - timedelta(hours=1, minutes=20)),
        (user_id, device_id, "System Armed", "LaptopGuard AI armed successfully.", "SECURITY", 1, now - timedelta(hours=2, minutes=15)),
    ]
    for n in notifs:
        cursor.execute("""
            INSERT INTO notifications (id, user_id, device_id, title, body, category, is_read, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, ("ntf_" + uuid.uuid4().hex[:10], n[0], n[1], n[2], n[3], n[4], n[5], n[6]))

    # 7. Camera Permissions & Device Permissions
    cursor.execute("""
        INSERT INTO camera_permissions (id, device_id, user_id, live_camera_allowed, snapshot_allowed, event_capture_allowed, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("cp_" + uuid.uuid4().hex[:10], device_id, user_id, 1, 1, 1, now))

    cursor.execute("""
        INSERT INTO device_permissions (id, device_id, camera_granted, microphone_granted, location_granted, os_status_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("dp_" + uuid.uuid4().hex[:10], device_id, 1, 0, 1, '{"camera": "allowed", "microphone": "denied", "location": "allowed"}', now))

    # 8. Security Settings
    cursor.execute("""
        INSERT INTO security_settings (
            id, device_id, movement_detection, network_change_alert,
            power_disconnect_alert, failed_login_alert, location_updates,
            security_level, auto_snapshot_on_alarm, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, ("ss_" + uuid.uuid4().hex[:10], device_id, 1, 1, 1, 1, 1, "Balanced", 1, now, now))

    # 9. Audit Logs
    audit_entries = [
        (user_id, device_id, "USER_LOGIN", '{"ip": "103.252.12.8", "client": "LaptopGuard Mobile iOS"}', "103.252.12.8", now - timedelta(hours=3)),
        (user_id, device_id, "DEVICE_ARMED", '{"mode": "Balanced", "source": "Mobile App"}', "103.252.12.8", now - timedelta(hours=2, minutes=15)),
        (user_id, device_id, "REMOTE_LOCK_ISSUED", '{"authorized_by": "Oska Perera", "reason": "Unattended motion"}', "103.252.12.8", now - timedelta(minutes=38)),
        (user_id, device_id, "ALARM_ACTIVATED", '{"sound": "Security Siren", "duration_sec": 30}', "103.252.12.8", now - timedelta(minutes=36)),
    ]
    for a in audit_entries:
        cursor.execute("""
            INSERT INTO audit_logs (id, user_id, device_id, action, details_json, ip_address, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, ("aud_" + uuid.uuid4().hex[:10], a[0], a[1], a[2], a[3], a[4], a[5]))

    # 10. Sample Evidence
    cursor.execute("""
        INSERT INTO evidence_files (
            id, device_id, file_type, file_name, file_path, file_size,
            trigger_event, retention_days, is_encrypted, expires_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "evi_snapshot_001", device_id, "SNAPSHOT", "snapshot_alarm_20260921.jpg",
        "evidence/dev_oska_xps15/snapshot_alarm_20260921.jpg", 248102,
        "ALARM_TRIGGERED", 7, 1, now + timedelta(days=7), now - timedelta(minutes=36)
    ))

    conn.commit()
    conn.close()
    print(f"Database successfully seeded for user oska@laptopguard.ai and device {device_id}!")

if __name__ == "__main__":
    seed_database()
