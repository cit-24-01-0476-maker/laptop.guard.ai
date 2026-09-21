# WebRTC Live Camera & Signaling Protocol

## Overview
Live Camera streaming connects the authorized client (Web Dashboard or Mobile App) directly to the paired Laptop Agent via WebRTC (DTLS-SRTP).

## Signaling Flow:
```
Client (Web/Mobile)            FastAPI Gateway Hub             Laptop Agent
         |                              |                           |
         |--- POST /camera/start ------>|                           |
         |<-- 200 OK (Session Token) ---|                           |
         |                              |-- START_CAMERA_SESSION -->|
         |                              |                           | (Displays on-screen red notice)
         |                              |                           | (Illuminates hardware LED)
         |--- SDP Offer (WSS) --------->|--- SDP Offer (WSS) ------>|
         |<-- SDP Answer (WSS) ---------|<-- SDP Answer (WSS) ------|
         |<-- ICE Candidates ---------->|<-- ICE Candidates ------->|
         |                              |                           |
         +<========================================================>+
                     Direct DTLS-SRTP Video Stream (P2P)
                     (or TURN Relay if NAT is symmetric)
```

## Security Constraints:
1. **5-Minute Hard Cutoff**: `CAMERA_SESSION_MAX_DURATION_SECONDS = 300`.
2. **Advance Warning**: At 240 seconds, a visual alert banner is rendered on both dashboard and agent.
3. **Audit Log Retention**: Every camera session records `user_id`, `device_id`, `started_at`, `duration`, and `termination_reason`.
