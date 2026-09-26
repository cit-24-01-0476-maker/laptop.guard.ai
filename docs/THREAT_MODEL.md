# LaptopGuard AI — Threat Model & Security Analysis

## 1. Scope & Objective
This document outlines the security architecture and STRIDE threat analysis for LaptopGuard AI, a defense system safeguarding unattended laptops against physical theft, unauthorized local tampering, network eavesdropping, and remote command injection.

---

## 2. Threat Analysis (STRIDE Matrix)

| Threat Category | Description | Primary Vector | Mitigation in LaptopGuard AI |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker impersonates the device or owner to send commands or forge telemetry. | Forged HTTP/WS packets, fake pairing requests. | - Mutual authentication with device-specific HMAC-SHA256 signature tokens.<br>- DPAPI-protected private device secrets.<br>- Cloud verification of device identity before dispatching commands. |
| **Tampering** | Attacker attempts to kill sentinel processes, modify local settings, or alter evidence files. | Task Manager kill, file deletion in `%ProgramData%`. | - Windows Service running in Session 0 as `LocalSystem` with restrictive ACLs.<br>- Mutual process watchdog between Service and SessionAgent.<br>- SQLite WAL mode with cryptographic checksums.<br>- In-memory state recovery on reboot. |
| **Repudiation** | Attacker denies unplugging power or performing unauthorized actions. | Denial of physical tampering. | - Cryptographically stamped local audit log.<br>- Immediate automatic webcam snapshot upon incident trigger.<br>- Local immutable event journal with monotonically incrementing sequence IDs. |
| **Information Disclosure** | Unauthorized parties access stored credentials, evidence photos, or location data. | Disk extraction, network packet sniffing. | - DPAPI encryption for sensitive tokens at rest.<br>- AES-256-GCM encryption for evidence files stored on disk.<br>- TLS 1.3 encryption for all backend and WebRTC signaling traffic. |
| **Denial of Service** | Attacker cuts Wi-Fi or enables Airplane Mode to prevent remote alerts. | Physical network disconnection, RF Faraday bag. | - **Offline-First Architecture**: Alarm siren, screen locking, and incident logging execute purely locally in < 50ms without network dependence.<br>- Event queue persists to SQLite for synchronization once connectivity is restored. |
| **Elevation of Privilege** | Standard user account attempts to disarm the sentinel or alter security mode. | Local UI interaction on laptop screen. | - Local Master PIN required to disarm device.<br>- Administrative UAC elevation required to modify service settings or uninstall software. |

---

## 3. Physical Theft Scenarios & Defenses

### Scenario 1: Grab-and-Run at Public Place (AC Power Snatch)
1. **Attacker Action**: Attacker disconnects AC power cord and grabs the laptop to flee.
2. **Sentinel Detection**: `GUID_ACDC_POWER_SOURCE` notification received in < 15ms.
3. **Execution**:
   - `LaptopGuard.Core` checks state: if `Armed`, instantly triggers `CRITICAL_INCIDENT`.
   - `user32.dll LockWorkStation()` invoked immediately (< 20ms).
   - Core Audio endpoint volume forced to 100%, siren audio played at maximum volume.
   - Screen displays full-screen deterrence warning banner.
   - Front camera captures photo of the perpetrator.
   - Event written to local durable SQLite journal and transmitted to Cloud Hub if online.
4. **Outcome**: Attacker holds a locked, shrieking laptop displaying anti-theft alert, with photo captured and stored.

### Scenario 2: Network Severance / Airplane Mode
1. **Attacker Action**: Attacker turns off Wi-Fi or closes lid to sever internet connectivity.
2. **Sentinel Reaction**: Local alarm and lock occur independently of network availability.
3. **Synchronization**: When the laptop is reopened or reconnects to any network (e.g. at attacker's premises), Sentinel detects network availability via `NetworkChange` and immediately syncs the queued event journal and snapshot to cloud, notifying owner via push notification.

### Scenario 3: Remote Command Replay
1. **Attacker Action**: Attacker captures a previous `DISARM` command packet and attempts to replay it over the network.
2. **Sentinel Verification**:
   - Verifies timestamp: `|request_timestamp - current_time| <= 60 seconds`.
   - Verifies nonce: nonces are checked against a sliding replay cache.
   - Verifies HMAC signature: calculated with DPAPI-stored device secret.
3. **Outcome**: Replayed command rejected with code `COMMAND_REPLAY_DETECTED`.

---

## 4. Privacy & Ethical Safeguards (Non-Covert Principle)
1. **Zero Covert Surveillance**: Background microphone eavesdropping is strictly prohibited.
2. **Mandatory Visual Indication**: Whenever a remote camera snapshot or WebRTC live stream is activated, a prominent, persistent red visual indicator banner is rendered on screen.
3. **Hardware LED Preservation**: The application does not attempt to circumvent or disable physical camera activity LEDs.
4. **Session Lifetime Caps**: Live camera streaming sessions are hard-capped at 300 seconds maximum duration.
