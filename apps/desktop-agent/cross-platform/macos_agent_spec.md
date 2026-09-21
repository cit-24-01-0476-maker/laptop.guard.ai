# macOS Laptop Security Agent Architecture Specification

## Overview
The macOS agent operates as a background launch agent daemon (`launchd`) paired with a SwiftUI menu-bar status item.

## Key macOS Subsystems & APIs:
1. **Power Management**:
   - `IOKit / IOPowerSources`: Subscribes to `kIOPSTimeRemainingNotification` to detect AC adapter disconnect / reconnect instantly.
2. **Network & Wi-Fi**:
   - `CoreWLAN (CWWiFiClient)`: Queries current SSID, BSSID, RSSI, and handles network transition notifications.
3. **Remote Lock**:
   - Native lock via `/System/Library/CoreServices/Menu Extras/User.menu/Contents/Resources/CGSession -suspend` or `SACLockScreenImmediate()`.
4. **Camera Privacy & Streaming**:
   - `AVFoundation`: `AVCaptureSession` respecting the Green Menu Bar Privacy Dot and hardware camera LED.
   - Screen Notification via `UserNotifications` or borderless `NSPanel`.
5. **Movement & Lid State**:
   - `IOKit / IOHIDEventSystem`: Subscribes to Sudden Motion Sensor (on older MacBooks) and Clamshell / Lid closure events.
