# Linux Laptop Security Agent Architecture Specification

## Overview
The Linux agent operates as a `systemd` user service with an optional AppIndicator / system tray tray applet.

## Key Linux Subsystems & APIs:
1. **Power Management**:
   - `UPower (org.freedesktop.UPower)` over D-Bus: Subscribes to `DeviceChanged` signals to detect AC unplug and battery percentage.
2. **Network & Wi-Fi**:
   - `NetworkManager (org.freedesktop.NetworkManager)` over D-Bus: Tracks active connections, Wi-Fi SSIDs, and IP renegotiations.
3. **Remote Lock**:
   - Invokes `loginctl lock-session` (systemd-logind), or `xdg-screensaver lock`.
4. **Camera & Video**:
   - Video4Linux2 (`/dev/video0`) through GStreamer or PipeWire. Never bypasses camera hardware indicators.
5. **Sensors**:
   - `iio-sensor-proxy` over D-Bus: Accesses accelerometer data on modern 2-in-1 laptops and convertibles.
