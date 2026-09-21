# LaptopGuard AI - Security & System Architecture

## 1. System Philosophy & Non-Covert Principle
LaptopGuard AI is an owner-centric personal device anti-theft and remote defense ecosystem designed for laptops left unattended in university libraries, cafés, classrooms, and shared workspaces.

**Core Rules:**
- **Zero Covert Surveillance**: Hidden webcam activation, background microphone recording, or bypassing hardware LEDs is prohibited.
- **Visible OS Feedback**: The Laptop Security Agent displays a red on-screen banner whenever a Live Camera session is active.
- **Cryptographic Command Signing**: Every remote command (`LOCK`, `ALARM`, `LOST_MODE`, `ARM`, `DISARM`) requires a unique nonce, timestamp, and signature with a 60-second expiration to prevent replay attacks.
- **5-Minute Session Cap**: Live Camera sessions are hard-capped at 300 seconds with an automated warning at 240 seconds.

---

## 2. End-to-End Architecture Diagram

```
+---------------------------+          Encrypted WSS          +----------------------------+
| Windows Laptop Agent      | <=============================> | FastAPI Real-Time Gateway  |
| - psutil Power Watchdog   |                                 | - JWT Auth & Command Sign  |
| - Wi-Fi SSID Sentinel     |                                 | - Bidirectional Hub        |
| - Win32 LockWorkStation   |                                 | - 14 Relational DB Tables  |
| - Siren & Alert Window    |                                 +----------------------------+
| - Camera Streamer         |                                               |
+---------------------------+                                               | HTTPS / WSS
              ^                                                             v
              |                                               +----------------------------+
              | Authenticated WebRTC (DTLS-SRTP)             | Next.js / React Web Client |
              +=============================================> | Flutter Mobile Application |
                                                              +----------------------------+
```

---

## 3. Threat Model & Environmental Watchdogs
1. **Power Disconnect (`POWER_DISCONNECT`)**:
   - Monitored via `psutil.sensors_battery()`.
   - If the AC power adapter is unplugged while the laptop is in Armed state, an immediate `CRITICAL` alert is triggered.
2. **Wi-Fi Transition (`WIFI_CHANGED`)**:
   - Monitored via Windows `netsh wlan show interfaces` and adapter queries.
   - If the laptop switches SSIDs (e.g. from `Campus_Secure` to an unauthorized hotspot), a `WARNING` or `CRITICAL` event is logged.
3. **Physical Motion (`MOVEMENT_DETECTED`)**:
   - Truthful hardware disclosure: Windows Sensor API / Accelerometer is queried. If unavailable, the agent truthfully discloses that accelerometer hardware is absent and relies on secondary environmental indicators.
4. **Remote Lock (`REMOTE_LOCK`)**:
   - Native Windows API `ctypes.windll.user32.LockWorkStation()` executes in <10ms upon verified owner command.
