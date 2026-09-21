# LaptopGuard AI

> **"Protect Your Laptop. Wherever You Go."**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcit-24-01-0476-maker%2Flaptop.guard.ai&root-directory=apps/web)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/cit-24-01-0476-maker/laptop.guard.ai)

A premium, production-style personal laptop anti-theft and remote security ecosystem. Built for users leaving their laptops unattended in university libraries, cafés, classrooms, offices, and shared workspaces.

---

## Key Security Features

- **Encrypted Remote Workstation Lock**: Executes native Windows `user32.LockWorkStation()` via signed cryptographic nonces with a 60-second TTL.
- **Environmental Security Watchdogs**:
  - **AC Power Disconnect**: Detects charger unplugging while armed and triggers an immediate high-priority alert.
  - **Wi-Fi Transition Detection**: Alerts when the laptop is moved to an unfamiliar SSID or drops connection.
  - **Truthful Motion Sensor Architecture**: Real accelerometer hardware is queried truthfully; if absent, transparently discloses status without false simulations.
- **Audible Deterrence Siren**: High-frequency siren alert and full-screen on-display security warning with owner PIN dismissal.
- **Authorized WebRTC Live Camera**:
  - Peer-to-peer DTLS-SRTP video stream.
  - **Strict Anti-Covert Principle**: Prominent on-screen red notification banner is displayed on the laptop screen and hardware camera LEDs are never bypassed.
  - Automated 5-minute session maximum with 60-second advance warning.
  - On-demand security snapshot capture stored in the Encrypted Evidence Vault.
- **Lost Mode**: High-priority location pinging, owner contact message broadcast, and automated alarm.
- **Honest Location Radar**: Realistic ~180-200m perimeter mapping based on Wi-Fi BSSID and IP geolocation.
- **Encrypted Local Event Queue**: Offline events are buffered securely on the laptop and automatically synchronized when connectivity returns.

---

## Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                            LAPTOPGUARD AI ECOSYSTEM                               |
+-----------------------------------------------------------------------------------+

     [ Windows / macOS / Linux Laptop ]              [ Cloud Backend Gateway ]
           (Laptop Security Agent)                     (FastAPI + WebSockets)
                      |                                          |
                      | <========== WSS Encrypted Hub =========> |
                      |    (Heartbeats, Signed Commands, Alerts) |
                      |                                          |
                      |                                  +-------+-------+
                      |                                  |               |
                      |                             [ PostgreSQL ]  [ Vault AES ]
                      |
                      | WebRTC DTLS-SRTP Live Feed
                      +==========================================+
                                                                 |
                                                                 v
                                                     [ Web & Mobile Clients ]
                                                     - React 18 / Next.js Web
                                                     - Flutter iOS / Android
```

---

## Tech Stack

| Tier | Technologies |
| :--- | :--- |
| **Web Dashboard** | React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons, Glassmorphic Apple-inspired UI |
| **Desktop Agent** | Python 3.11, ctypes Win32 Interop, `psutil`, `websockets`, Tkinter UI, C# .NET 10 Solution |
| **Mobile App** | Flutter 3.x, Dart, Clean Architecture, Cupertino & Material |
| **Backend API** | FastAPI, Python 3.11, Pydantic v2, SQLAlchemy, WebSockets, PyJWT, PBKDF2 |
| **Database** | SQLite (Default Dev) / PostgreSQL (Production), 14 Relational Tables |
| **Streaming** | WebRTC, STUN/TURN, DTLS-SRTP |

---

## Monorepo Layout

```
laptopguard-ai/
├── apps/
│   ├── web/                     # React / TypeScript Glassmorphic Dashboard
│   ├── mobile/                  # Flutter iOS & Android Mobile Application
│   └── desktop-agent/           # Windows Native Security Agent & .NET 10 solution
├── database/
│   ├── schema.sql               # 14 Relational tables & indexes
│   ├── seed.py                  # Seed script (Oska Laptop demo data)
│   └── laptopguard.db           # Development SQLite database
├── services/
│   └── backend/                 # FastAPI server, WebSockets hub, WebRTC signaling
├── packages/
│   ├── types/                   # Shared TypeScript definitions
│   └── security/                # Cryptographic signing & envelope validation
├── docs/                        # Complete Architecture, API & Privacy Guides
└── README.md
```

---

## Quickstart Guide

### 1. Initialize & Seed Database
```bash
python database/seed.py
```

### 2. Launch FastAPI Backend Server
```bash
python -m uvicorn services.backend.main:app --host 0.0.0.0 --port 8000 --reload
```
*API Swagger Documentation is available at `http://localhost:8000/api/docs`.*

### 3. Launch Web Dashboard
```bash
cd apps/web
npm run dev
```
*Open `http://localhost:3000` in your browser.*

### 4. Launch Windows Laptop Security Agent
```bash
cd apps/desktop-agent
python agent_main.py
```
*The agent will connect to `ws://localhost:8000/ws/device/dev_oska_xps15`, display the status GUI, and begin monitoring power, network, and commands.*

---

## Verification & Interactive Testing

1. **Arm / Disarm**: Click "Arm Device" on the Web Dashboard. The Desktop Agent receives the signed command envelope, logs the event, and updates status to `Protected`.
2. **Power Disconnect Alert**: Unplug the laptop AC charger (or trigger via GUI). An immediate `CRITICAL` alert pops up on the dashboard timeline.
3. **Remote Lock**: Press "Lock Laptop" on the Web Dashboard. Confirm the modal. The desktop agent invokes `ctypes.windll.user32.LockWorkStation()`.
4. **Live Camera**: Launch the Live Camera console. Notice the mandatory privacy banner on both web dashboard and agent, the 5-minute countdown timer, and test taking an authorized snapshot.
