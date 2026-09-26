# LaptopGuard AI — Phased Implementation Plan

## Overview
This implementation plan defines the step-by-step roadmap to rebuild LaptopGuard AI into a production-grade personal laptop anti-theft security platform.

---

## Phase 0: Discovery & Architecture Specification (Current Phase)
- [x] Step 1: Complete inspection of existing repository.
- [x] Step 2: Detailed repository inventory.
- [x] Step 3: Identify deprecated old Windows & Mobile components.
- [x] Step 4: Identify surviving assets (branding, backend models, schema, deployment configs).
- [x] Step 5: Create and verify safe backup (Git branch `backup/pre-production-rebuild` & tag `v0.9-pre-rebuild`).
- [x] Step 6: Propose exact new monorepo structure.
- [x] Step 7: Formulate Windows local-security architecture (.NET 10 / C# Windows Service + SessionAgent + Desktop + Core + SQLite + DPAPI).
- [x] Step 8: Formulate Threat Model & STRIDE analysis.
- [x] Step 9: Formulate Phased Implementation Plan.
- [x] Step 10: Deliver Discovery Report with mandatory status schema.

---

## Phase 1: Windows Sentinel Core & Local Offline Defense (Milestone 1)
- **Goal**: Windows laptop armed -> AC power disconnected -> Real local alarm + Windows lock executed locally (≤500ms p95 response, offline-first, without waiting on cloud).
- [ ] Setup `apps/windows/LaptopGuard.sln` targeting .NET 10.
- [ ] Build `LaptopGuard.Core`:
  - Finite State Machine: `Disarmed`, `ArmingGrace`, `Armed`, `Triggered`, `LostMode`.
  - Durable Local SQLite Database (`Microsoft.Data.Sqlite`) for local event journal and offline queue.
  - Windows DPAPI wrapper for hardware-bound encryption.
- [ ] Build `LaptopGuard.Service`:
  - Background Windows Service with Win32 `RegisterPowerSettingNotification(GUID_ACDC_POWER_SOURCE)`.
  - Secure Named Pipe IPC Server (`\\.\pipe\LaptopGuardSecurity`).
  - Offline event queue manager.
- [ ] Build `LaptopGuard.SessionAgent`:
  - Interactive session listener connecting to Named Pipe.
  - Native `LockWorkStation()` caller.
  - Core Audio volume override + high-priority siren playback.
  - Deterrence HUD alert overlay.
- [ ] Local Offline Resilience Tests:
  - Disconnect AC while offline -> Measure latency to lock & siren (target ≤ 500ms).

---

## Phase 2: Windows Desktop GUI & Device Identity
- **Goal**: Full-featured WPF MVVM desktop app with system tray icon, PIN protection, and pairing display.
- [ ] Modern dark-themed WPF MVVM UI with Material/Fluent styling.
- [ ] System Tray NotifyIcon (`Protected`, `Warning`, `Offline` dynamic icons).
- [ ] Local Master PIN setup and validation (PBKDF2/Argon2 hashing).
- [ ] Dynamic QR Code generation for mobile device pairing.
- [ ] Real-time local diagnostics, hardware status, and incident log viewer.

---

## Phase 3: Cloud Gateway & Bidirectional Synchronization
- **Goal**: Real-time authenticated communication between Windows Sentinel and Cloud Backend.
- [ ] Cloud WebSocket gateway integration (`/ws/device/{device_id}`).
- [ ] Heartbeat and real-time device telemetry (battery, charging, Wi-Fi SSID, lock status).
- [ ] Replay-protected command execution engine (HMAC-SHA256, nonce, expiration).
- [ ] Automatic synchronization of offline SQLite event queue upon network reconnection.
- [ ] Cloud security incident ingestion and alert dispatching.

---

## Phase 4: Mobile Remote Companion (Flutter / Native)
- **Goal**: Cross-platform mobile remote client for owner alerts and remote commands.
- [ ] Flutter mobile project structure (`apps/mobile`).
- [ ] Fast QR code scanner for 1-click device pairing.
- [ ] Live device dashboard: Real-time status, battery gauge, charging state, armed toggle.
- [ ] Instant push notification handling (FCM / APNs) on critical incidents.
- [ ] One-tap emergency controls: Remote Lock, Siren Sound, Lost Mode, Snapshot Request.

---

## Phase 5: Secure Evidence Capture & WebRTC Live Streaming
- **Goal**: Owner verification through webcam snapshot and low-latency encrypted live streaming.
- [ ] Automatic webcam snapshot capture upon security incident.
- [ ] AES-256-GCM encrypted local evidence storage in `%ProgramData%\LaptopGuard\Evidence`.
- [ ] WebRTC peer-to-peer live streaming session with DTLS-SRTP encryption.
- [ ] Non-covert compliance: Mandatory red on-screen banner ("Live View Active") + 300s hard cutoff.

---

## Phase 6: Production Installer & Auto-Updater
- **Goal**: Professional one-click installer and verified auto-updater.
- [ ] Inno Setup compilation: installs Windows Service, SessionAgent, Desktop GUI, creates system tray autostart.
- [ ] Cryptographically signed auto-updater with rollback protection.
- [ ] Cloud download portal hosting setup for latest installer binaries.
