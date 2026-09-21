import unittest
import requests
import json
import time
from services.backend.database import SessionLocal
from services.backend import models
from packages.security.signer import generate_command_envelope, verify_command_envelope

class TestLaptopGuardEcosystem(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_01_database_seeded_data(self):
        """Verifies database tables and seeded user & device."""
        user = self.db.query(models.User).filter(models.User.email == "oska@laptopguard.ai").first()
        self.assertIsNotNone(user, "Default user oska@laptopguard.ai should exist")
        self.assertEqual(user.full_name, "Oska Perera")

        device = self.db.query(models.Device).filter(models.Device.id == "dev_oska_xps15").first()
        self.assertIsNotNone(device, "Oska Laptop should exist")
        self.assertEqual(device.device_name, "Oska Laptop")
        self.assertEqual(device.status, "Protected")

        events_count = self.db.query(models.SecurityEvent).filter(models.SecurityEvent.device_id == "dev_oska_xps15").count()
        self.assertGreaterEqual(events_count, 5, "Should have seeded security timeline events")

    def test_02_cryptographic_command_signing(self):
        """Tests that command envelopes are generated with nonces and verified correctly."""
        envelope = generate_command_envelope(
            command_type="LOCK_DEVICE",
            device_id="dev_oska_xps15",
            user_id="usr_001",
            payload={"reason": "unattended_drill"}
        )
        self.assertIn("signature", envelope)
        self.assertIn("nonce", envelope)
        
        # Verify genuine envelope
        is_valid, reason = verify_command_envelope(envelope)
        self.assertTrue(is_valid, f"Envelope should be valid, failed with: {reason}")

        # Tamper check
        tampered = envelope.copy()
        tampered["command_type"] = "PLAY_ALARM"
        is_valid_tampered, _ = verify_command_envelope(tampered)
        self.assertFalse(is_valid_tampered, "Tampered envelope must fail cryptographic signature verification")

    def test_03_offline_queue_resilience(self):
        """Tests local offline event queue encryption and retrieval."""
        import sys
        from pathlib import Path
        import os

        agent_dir = Path(__file__).resolve().parent / "apps" / "desktop-agent"
        sys.path.insert(0, str(agent_dir))
        from offline_queue import OfflineEventQueue

        test_file = "test_queue.enc.json"
        queue = OfflineEventQueue(test_file)
        queue.enqueue({"event_type": "POWER_DISCONNECT", "severity": "WARNING", "battery": 75})

        events = queue.get_queued_events()
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["event_type"], "POWER_DISCONNECT")

        queue.clear()
        self.assertEqual(len(queue.get_queued_events()), 0)
        if os.path.exists(test_file):
            os.remove(test_file)

if __name__ == "__main__":
    unittest.main()
