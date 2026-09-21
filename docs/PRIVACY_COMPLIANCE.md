# Privacy Compliance & Anti-Covert Architecture

## Strict Anti-Surveillance Safeguards
LaptopGuard AI is engineered exclusively for authorized owner defense:

1. **Hardware LED Preservation**:
   - The agent never attempts to tamper with or bypass the physical camera LED indicator.
2. **On-Screen Notification**:
   - When a remote camera view begins, a top-most floating banner appears on the laptop screen:
     `🔴 CAMERA IN USE BY LAPTOPGUARD AI - Authorized remote live view active by device owner.`
3. **Microphone Inactive by Default**:
   - Microphones are never continuously recorded. Audio streaming is disabled by default.
4. **No Simulated or Falsified Sensors**:
   - If a laptop lacks an accelerometer, LaptopGuard AI truthfully declares:
     `"Physical movement detection is unavailable on this device."`
5. **GDPR & User Sovereignty**:
   - Users can download their complete telemetry history via `/api/v1/privacy/export-data` and execute a permanent wipe with `/api/v1/privacy/delete-all-evidence`.
