import asyncio
import uuid
import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from services.backend.main import app
from services.backend.database import Base, get_db
from services.backend import models
from services.backend.auth import get_password_hash, create_access_token
from services.backend.websocket_hub import hub
from services.backend.routers.pairing_router import rate_limit_failures

# SQLite database for tests
TEST_DATABASE_URL = "sqlite:///./test_security_guard.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

# Helper to create user & token
def create_test_user(db, email=None, full_name="Test User", password="Password123!", role="owner", secret_pin="6728"):
    if not email:
        email = f"user_{uuid.uuid4().hex[:6]}@example.com"
    user = models.User(
        id=f"usr_{uuid.uuid4().hex[:8]}",
        email=email,
        password_hash=get_password_hash(password),
        full_name=full_name,
        role=role,
        two_factor_enabled=True,
        two_factor_secret=secret_pin,
        created_at=datetime.datetime.utcnow()
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(data={"sub": user.id})
    return user, token

# Helper to pair a device cleanly
def pair_device_for_user(db, user, token, device_name="Dell Sentinel"):
    dev_id = f"dev_{uuid.uuid4().hex[:8]}"
    req_resp = client.post("/api/v1/pairing/request", json={
        "device_id": dev_id,
        "device_name": device_name,
        "device_public_key": "ed25519_pk_test",
        "manufacturer": "Dell Inc.",
        "model": "G15 5530",
        "os_version": "Windows 11",
        "agent_version": "1.7.0"
    })
    assert req_resp.status_code == 200, req_resp.text
    p_data = req_resp.json()
    code = p_data["pairing_code"]
    p_req_id = p_data["pairing_request_id"]

    claim_resp = client.post(
        "/api/v1/pairing/claim",
        headers={"Authorization": f"Bearer {token}"},
        json={"pairing_code": code}
    )
    assert claim_resp.status_code == 200, claim_resp.text

    confirm_resp = client.post("/api/v1/pairing/confirm", json={
        "pairing_request_id": p_req_id,
        "device_id": dev_id,
        "approved": True
    })
    assert confirm_resp.status_code == 200, confirm_resp.text

    return dev_id, p_req_id, code

# Reset schema before testing
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

# =============================================================================
# 15 MANDATORY SECURITY REBUILD TESTS
# =============================================================================

def test_01_user_a_pairs_device_successfully():
    """TEST 1: Windows Sentinel initiates pairing, User A claims, Sentinel approves locally."""
    db = TestingSessionLocal()
    user_a, token_a = create_test_user(db, email="alice_t1@test.com", full_name="Alice Tester")
    
    device_id = f"dev_sentinel_{uuid.uuid4().hex[:6]}"
    
    # 1. Sentinel requests pairing code
    req_resp = client.post("/api/v1/pairing/request", json={
        "device_id": device_id,
        "device_name": "Alice Dell XPS",
        "device_public_key": "ed25519_pk_alice",
        "manufacturer": "Dell Inc.",
        "model": "XPS 15",
        "os_version": "Windows 11 Pro",
        "agent_version": "1.7.0"
    })
    assert req_resp.status_code == 200
    pairing_data = req_resp.json()
    pairing_code = pairing_data["pairing_code"]
    pairing_req_id = pairing_data["pairing_request_id"]
    assert pairing_code.startswith("LG-")

    # 2. User A claims code from Web / Mobile
    claim_resp = client.post(
        "/api/v1/pairing/claim",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"pairing_code": pairing_code}
    )
    assert claim_resp.status_code == 200
    assert claim_resp.json()["status"] == "CLAIMED"

    # 3. Sentinel checks status
    status_resp = client.get(f"/api/v1/pairing/status/{pairing_req_id}")
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "CLAIMED"
    assert status_resp.json()["claimed_by_email"].startswith("al***@")

    # 4. Sentinel approves pairing locally
    confirm_resp = client.post("/api/v1/pairing/confirm", json={
        "pairing_request_id": pairing_req_id,
        "device_id": device_id,
        "approved": True
    })
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["status"] == "CONSUMED"

    # 5. Verify Device A is listed in User A's devices
    devices_resp = client.get("/api/v1/devices", headers={"Authorization": f"Bearer {token_a}"})
    assert devices_resp.status_code == 200
    devs = devices_resp.json()
    assert len(devs) == 1
    assert devs[0]["id"] == device_id
    assert devs[0]["device_name"] == "Alice Dell XPS"
    assert devs[0]["status"] == "Protected"
    db.close()


def test_02_user_b_signs_in_sees_zero_devices():
    """TEST 2: User B creates an account, signs in -> sees exactly 0 devices. No auto-claim."""
    db = TestingSessionLocal()
    user_b, token_b = create_test_user(db, email="bob_t2@test.com", full_name="Bob Tester")

    devices_resp = client.get("/api/v1/devices", headers={"Authorization": f"Bearer {token_b}"})
    assert devices_resp.status_code == 200
    assert devices_resp.json() == [] # Absolutely 0 devices
    db.close()


def test_03_user_b_idor_device_access_rejected():
    """TEST 3: User B attempts direct IDOR access to User A's Device A -> 404 Not Found."""
    db = TestingSessionLocal()
    user_a, token_a = create_test_user(db, email="alice_t3@test.com")
    dev_a_id, _, _ = pair_device_for_user(db, user_a, token_a, "Alice Device T3")

    user_b, token_b = create_test_user(db, email="charlie_t3@test.com")

    # Direct IDOR GET device
    resp1 = client.get(f"/api/v1/devices/{dev_a_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert resp1.status_code == 404 # No device existence leakage

    # Direct IDOR GET device status
    resp2 = client.get(f"/api/v1/devices/{dev_a_id}/status", headers={"Authorization": f"Bearer {token_b}"})
    assert resp2.status_code == 404
    db.close()


def test_04_user_b_idor_evidence_rejected():
    """TEST 4: User B attempts to access/delete User A's evidence -> 404 Not Found."""
    db = TestingSessionLocal()
    user_a, token_a = create_test_user(db, email="alice_t4@test.com")
    dev_a_id, _, _ = pair_device_for_user(db, user_a, token_a, "Alice Device T4")
    
    # Create evidence for Device A
    evidence = models.EvidenceFile(
        id=f"ev_{uuid.uuid4().hex[:8]}",
        device_id=dev_a_id,
        file_type="SNAPSHOT",
        file_name="snapshot_test.jpg",
        file_path="evidence_vault/snapshot_test.jpg",
        file_size=1024,
        created_at=datetime.datetime.utcnow()
    )
    db.add(evidence)
    db.commit()

    user_b, token_b = create_test_user(db, email="bob_t4@test.com")

    # User B attempts to download User A's evidence
    dl_resp = client.get(f"/api/v1/evidence/{evidence.id}/download", headers={"Authorization": f"Bearer {token_b}"})
    assert dl_resp.status_code == 404

    # User B attempts to delete User A's evidence
    del_resp = client.delete(f"/api/v1/evidence/{evidence.id}", headers={"Authorization": f"Bearer {token_b}"})
    assert del_resp.status_code == 404
    db.close()


def test_05_untrusted_browser_controller_is_locked():
    """TEST 5: Untrusted browser session cannot execute High-Risk commands (e.g. LOCK, SIREN, ARM)."""
    db = TestingSessionLocal()
    user_a, token_a = create_test_user(db, email="alice_t5@test.com")
    dev_a_id, _, _ = pair_device_for_user(db, user_a, token_a, "Alice Device T5")

    # Send command with unknown/untrusted controller
    cmd_resp = client.post(
        "/api/v1/commands/send",
        headers={
            "Authorization": f"Bearer {token_a}",
            "x-controller-id": "untrusted_browser_tab_999"
        },
        json={
            "device_id": dev_a_id,
            "command_type": "TRIGGER_ALARM",
            "parameters": {"siren": True}
        }
    )
    assert cmd_resp.status_code == 403
    assert "CONTROLLER_NOT_TRUSTED" in cmd_resp.json()["detail"]
    db.close()


def test_06_step_up_controller_authorization_unlocks_control():
    """TEST 6: Step-up authorization with security PIN unlocks the browser controller."""
    db = TestingSessionLocal()
    user_a, token_a = create_test_user(db, email="alice_t6@test.com", secret_pin="6728")
    dev_a_id, _, _ = pair_device_for_user(db, user_a, token_a, "Alice Device T6")

    browser_controller_id = "browser_ctrl_chrome_win11_t6"

    # Step-up authorization via PIN
    auth_resp = client.post(
        "/api/v1/controllers/authorize",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "controller_id": browser_controller_id,
            "controller_type": "WEB_BROWSER",
            "display_name": "Chrome on Windows 11 Workstation",
            "verification_code_or_pin": "6728"
        }
    )
    assert auth_resp.status_code == 200
    assert auth_resp.json()["is_trusted"] is True

    # Now execute command with authorized controller ID
    cmd_resp = client.post(
        "/api/v1/commands/send",
        headers={
            "Authorization": f"Bearer {token_a}",
            "x-controller-id": browser_controller_id
        },
        json={
            "device_id": dev_a_id,
            "command_type": "TRIGGER_ALARM",
            "parameters": {"siren": True}
        }
    )
    assert cmd_resp.status_code == 200
    assert cmd_resp.json()["status"] == "PENDING"
    db.close()


def test_07_single_use_pairing_code_replay_rejected():
    """TEST 7: A consumed pairing code cannot be claimed or confirmed again."""
    db = TestingSessionLocal()
    user_a, token_a = create_test_user(db, email="alice_t7@test.com")
    dev_id, req_id, code = pair_device_for_user(db, user_a, token_a, "Alice Device T7")

    # Attempt to confirm again
    reconfirm_resp = client.post("/api/v1/pairing/confirm", json={
        "pairing_request_id": req_id,
        "device_id": dev_id,
        "approved": True
    })
    assert reconfirm_resp.status_code == 400
    assert "PAIRING_CODE_ALREADY_USED" in reconfirm_resp.json()["detail"]
    db.close()


def test_08_expired_pairing_code_rejected():
    """TEST 8: Expired pairing code rejected."""
    db = TestingSessionLocal()
    user_a, token_a = create_test_user(db, email="alice_t8@test.com")

    # Generate fresh request
    req_resp = client.post("/api/v1/pairing/request", json={
        "device_id": f"dev_exp_{uuid.uuid4().hex[:6]}",
        "device_name": "Expiring Laptop",
        "device_public_key": "exp_pk"
    })
    assert req_resp.status_code == 200
    code = req_resp.json()["pairing_code"]
    req_id = req_resp.json()["pairing_request_id"]

    # Manually expire in DB
    p_req = db.query(models.PairingRequest).filter(models.PairingRequest.id == req_id).first()
    p_req.expires_at = datetime.datetime.utcnow() - datetime.timedelta(seconds=10)
    db.commit()

    # Attempt claim
    claim_resp = client.post(
        "/api/v1/pairing/claim",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"pairing_code": code}
    )
    assert claim_resp.status_code == 400
    assert "PAIRING_CODE_EXPIRED" in claim_resp.json()["detail"]
    db.close()


def test_09_pairing_brute_force_rate_limited():
    """TEST 9: Pairing claim rate limiting blocks brute force attempts after 5 failures."""
    db = TestingSessionLocal()
    user_a, token_a = create_test_user(db, email="alice_t9@test.com")

    # Clear any previous test rate limit records
    rate_limit_failures.clear()

    # Make 5 failed attempts (attempts 1 to 5 fail with 400, on 5th failure lockout is set)
    for _ in range(5):
        resp = client.post(
            "/api/v1/pairing/claim",
            headers={"Authorization": f"Bearer {token_a}"},
            json={"pairing_code": "LG-INVALID-CODE"}
        )
        assert resp.status_code == 400

    # Next attempt (6th) should be HTTP 429
    blocked_resp = client.post(
        "/api/v1/pairing/claim",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"pairing_code": "LG-ANOTHER-TRY"}
    )
    assert blocked_resp.status_code == 429
    assert "Too many failed pairing attempts" in blocked_resp.json()["detail"]

    # Clean up rate limit state
    rate_limit_failures.clear()
    db.close()


def test_10_revoked_controller_immediately_blocked():
    """TEST 10: Revoked controller is immediately blocked from issuing commands."""
    db = TestingSessionLocal()
    user_a, token_a = create_test_user(db, email="alice_t10@test.com")
    dev_a_id, _, _ = pair_device_for_user(db, user_a, token_a, "Alice Device T10")

    ctrl_id = f"ctrl_test_{uuid.uuid4().hex[:6]}"

    # Authorize controller first
    client.post(
        "/api/v1/controllers/authorize",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"controller_id": ctrl_id, "verification_code_or_pin": "6728"}
    )

    # Revoke controller
    revoke_resp = client.post(
        f"/api/v1/controllers/{ctrl_id}/revoke",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert revoke_resp.status_code == 200

    # Attempt command with revoked controller
    cmd_resp = client.post(
        "/api/v1/commands/send",
        headers={
            "Authorization": f"Bearer {token_a}",
            "x-controller-id": ctrl_id
        },
        json={
            "device_id": dev_a_id,
            "command_type": "TRIGGER_ALARM",
            "parameters": {"siren": True}
        }
    )
    assert cmd_resp.status_code == 403
    assert "CONTROLLER_NOT_TRUSTED" in cmd_resp.json()["detail"]
    db.close()


def test_11_device_removal_cleans_ownership():
    """TEST 11: Removing a device marks ownership revoked and stops commands."""
    db = TestingSessionLocal()
    user_a, token_a = create_test_user(db, email="alice_t11@test.com")
    dev_id, _, _ = pair_device_for_user(db, user_a, token_a, "Alice Device T11")

    # Authorize controller
    client.post(
        "/api/v1/controllers/authorize",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"controller_id": "ctrl_removal_t11", "verification_code_or_pin": "6728"}
    )

    # Remove device
    remove_resp = client.post(
        f"/api/v1/devices/{dev_id}/remove",
        headers={"Authorization": f"Bearer {token_a}", "x-controller-id": "ctrl_removal_t11"}
    )
    assert remove_resp.status_code == 200

    # Verify device no longer returned in list
    devices_resp = client.get("/api/v1/devices", headers={"Authorization": f"Bearer {token_a}"})
    assert devices_resp.status_code == 200
    assert all(d["id"] != dev_id for d in devices_resp.json())
    db.close()


def test_12_password_compromise_without_controller():
    """TEST 12: An attacker with compromised credentials cannot command devices without controller authorization."""
    db = TestingSessionLocal()
    # Victim user
    victim, victim_token = create_test_user(db, email="victim_t12@test.com", full_name="Victim User", secret_pin="9999")
    dev_id, _, _ = pair_device_for_user(db, victim, victim_token, "Victim PC")

    # Attacker logs in with victim password from new untrusted machine
    attacker_login = client.post("/api/v1/auth/login", json={"email": "victim_t12@test.com", "password": "Password123!"})
    assert attacker_login.status_code == 200
    attacker_token = attacker_login.json()["access_token"]
    assert attacker_login.json()["is_controller_trusted"] is False

    # Attacker attempts to arm/lock device without authorized controller
    att_cmd = client.post(
        "/api/v1/commands/send",
        headers={"Authorization": f"Bearer {attacker_token}", "x-controller-id": "attacker_laptop"},
        json={"device_id": dev_id, "command_type": "LOCK_DEVICE"}
    )
    assert att_cmd.status_code == 403
    assert "CONTROLLER_NOT_TRUSTED" in att_cmd.json()["detail"]
    db.close()


def test_13_cross_account_camera_rejected():
    """TEST 13: Camera access across accounts is completely rejected (404)."""
    db = TestingSessionLocal()
    victim, victim_token = create_test_user(db, email="victim_t13@test.com")
    victim_dev_id, _, _ = pair_device_for_user(db, victim, victim_token, "Victim Cam PC")

    # User B attempts snapshot of victim's device
    user_b, token_b = create_test_user(db, email="bob_t13@test.com")

    cam_resp = client.get(
        f"/api/v1/camera/snapshot/{victim_dev_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert cam_resp.status_code == 404
    db.close()


def test_14_cross_account_location_rejected():
    """TEST 14: Refreshing location for another user's device is rejected (404)."""
    db = TestingSessionLocal()
    victim, victim_token = create_test_user(db, email="victim_t14@test.com")
    victim_dev_id, _, _ = pair_device_for_user(db, victim, victim_token, "Victim Loc PC")

    user_b, token_b = create_test_user(db, email="bob_t14@test.com")

    loc_resp = client.post(
        f"/api/v1/devices/{victim_dev_id}/refresh-location",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert loc_resp.status_code == 404
    db.close()


def test_15_websocket_hub_cross_account_isolation():
    """TEST 15: WebSocket broadcasts are isolated strictly to authenticated recipient."""
    class MockWebSocket:
        def __init__(self):
            self.messages = []
        async def send_text(self, text):
            self.messages.append(text)

    mock_ws_alice = MockWebSocket()
    mock_ws_bob = MockWebSocket()

    hub.active_clients["user_alice_123"] = {mock_ws_alice}
    hub.active_clients["user_bob_456"] = {mock_ws_bob}

    async def run_broadcast():
        # Broadcast event intended strictly for Alice
        await hub.broadcast_to_user("user_alice_123", {"event": "ALARM_TRIGGERED", "device": "Alice_PC"})

    asyncio.run(run_broadcast())

    # Assert Alice received 1 message
    assert len(mock_ws_alice.messages) == 1
    assert "ALARM_TRIGGERED" in mock_ws_alice.messages[0]

    # Assert Bob received ZERO messages (zero cross-user leakage)
    assert len(mock_ws_bob.messages) == 0


def test_16_target_email_pairing_lock():
    """
    Test 16: Device pairing code locked to specific email.
    If issued for alice@example.com, bob@example.com cannot claim it.
    Only alice@example.com can claim it.
    """
    db = TestingSessionLocal()
    alice, alice_token = create_test_user(db, email="alice_security@example.com")
    bob, bob_token = create_test_user(db, email="bob_intruder@example.com")

    dev_id = f"dev_{uuid.uuid4().hex[:8]}"
    req_resp = client.post("/api/v1/pairing/request", json={
        "device_id": dev_id,
        "device_name": "Alice Locked Laptop",
        "device_public_key": "ed25519_alice_laptop",
        "target_email": "alice_security@example.com"
    })
    assert req_resp.status_code == 200
    pairing_code = req_resp.json()["pairing_code"]

    # Bob attempts to claim Alice's code -> REJECTED 403 FORBIDDEN
    bob_claim = client.post("/api/v1/pairing/claim", json={
        "pairing_code": pairing_code
    }, headers={"Authorization": f"Bearer {bob_token}"})
    assert bob_claim.status_code == 403
    assert "issued specifically for alice_security@example.com" in bob_claim.json()["detail"]

    # Alice claims her code -> SUCCESS 200 OK
    alice_claim = client.post("/api/v1/pairing/claim", json={
        "pairing_code": pairing_code
    }, headers={"Authorization": f"Bearer {alice_token}"})
    assert alice_claim.status_code == 200
    assert alice_claim.json()["status"] == "CLAIMED"


def test_17_universal_pairing_without_email_lock():
    """
    Test 17: Universal Device Pairing (no target_email).
    Any valid registered user can claim the code, and prefix (LG-) is flexible.
    """
    db = TestingSessionLocal()
    user, user_token = create_test_user(db, email="anyuser@laptopguard.ai")

    dev_id = f"dev_{uuid.uuid4().hex[:8]}"
    req_resp = client.post("/api/v1/pairing/request", json={
        "device_id": dev_id,
        "device_name": "Universal Laptop",
        "device_public_key": "ed25519_universal_laptop",
        "target_email": None
    })
    assert req_resp.status_code == 200
    pairing_code = req_resp.json()["pairing_code"] # e.g. LG-ABCD-1234

    # User claims with code stripped of LG- prefix
    raw_unprefixed = pairing_code.replace("LG-", "").replace("-", "")
    claim_resp = client.post("/api/v1/pairing/claim", json={
        "pairing_code": raw_unprefixed
    }, headers={"Authorization": f"Bearer {user_token}"})
    assert claim_resp.status_code == 200
    assert claim_resp.json()["status"] == "CLAIMED"


