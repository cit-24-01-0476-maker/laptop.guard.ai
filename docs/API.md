# LaptopGuard AI - REST & WebSocket API Specification

## Base URL
- REST: `http://localhost:8000/api/v1`
- WebSocket Hub: `ws://localhost:8000/ws`

---

## Authentication Endpoints (`/auth`)
- `POST /auth/register`: Create user profile and obtain JWT token.
- `POST /auth/login`: Authenticate email and password.
- `GET /auth/me`: Retrieve current user profile and 2FA status.

---

## Device Management (`/devices`)
- `GET /devices`: List all authorized devices paired to user.
- `GET /devices/{id}`: Detailed telemetry, battery, and location for device.
- `POST /devices/generate-pairing-token`: Generate expiring one-time cryptographic pairing token and QR code payload.
- `POST /devices/confirm-pairing`: Link agent with device public key.
- `PATCH /devices/{id}`: Update device name or settings.

---

## Remote Commands (`/commands`)
- `POST /commands/{device_id}`: Issue signed command (`LOCK_DEVICE`, `PLAY_ALARM`, `STOP_ALARM`, `ARM_DEVICE`, `DISARM_DEVICE`, `ENABLE_LOST_MODE`, `DISABLE_LOST_MODE`, `START_CAMERA_SESSION`, `STOP_CAMERA_SESSION`, `TAKE_SECURITY_SNAPSHOT`).
- `GET /commands/status/{command_id}`: Check execution status.

---

## Security Events Timeline (`/events`)
- `GET /events`: Retrieve filterable chronological timeline.
- `POST /events/report`: Endpoint used by desktop agent to ingest detected security events.

---

## Live Camera (`/camera`)
- `POST /camera/start`: Validates permissions, generates 5-minute session token, logs to audit trail, and signals agent.
- `POST /camera/stop/{session_id}`: Terminates stream and updates session duration.

---

## Evidence Vault (`/evidence`)
- `GET /evidence`: List stored snapshots, clips, and audio.
- `POST /evidence/upload`: Secure multipart upload of watermarked snapshots.
- `GET /evidence/file/{id}`: Retrieve file binary.
- `DELETE /evidence/{id}`: Permanently delete evidence with audit log.

---

## Privacy & Audits (`/privacy`)
- `GET /privacy/status/{device_id}`: Summary of OS permissions.
- `POST /privacy/delete-all-evidence/{device_id}`: Cryptographic wipe.
- `GET /privacy/audit-trail`: Immutable log of all sensitive actions.
- `GET /privacy/export-data`: Complete GDPR JSON export.
