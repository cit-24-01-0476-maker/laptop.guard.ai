"""
LaptopGuard AI - Windows Desktop Application (.exe)
Features:
- Windows 11 Modern Glass Interface (CustomTkinter)
- Real Hardware Win32 AC Power Watchdog (500ms polling)
- Remote user32.LockWorkStation execution
- High-Decibel Siren with 15-second smart auto-silence
- Live authorized webcam streaming
- Cloud WebSocket bidirectional sync
"""

import os
import sys
import json
import time
import threading
import asyncio
import logging
from pathlib import Path

# Setup paths for standalone executable compatibility
if getattr(sys, 'frozen', False):
    AGENT_DIR = Path(sys._MEIPASS)
    PROJECT_ROOT = AGENT_DIR
else:
    AGENT_DIR = Path(__file__).resolve().parent
    PROJECT_ROOT = AGENT_DIR.parent.parent

sys.path.insert(0, str(PROJECT_ROOT))
sys.path.insert(0, str(AGENT_DIR))

from config import (
    DEVICE_ID, DEVICE_NAME, BACKEND_HTTP_URL, BACKEND_WS_URL,
    LOCAL_QUEUE_FILE, SECRET_KEY
)
from monitors.power_monitor import PowerMonitor
from monitors.network_monitor import NetworkMonitor
from monitors.movement_detector import MovementDetector
from monitors.login_monitor import LoginMonitor
from actions.remote_lock import lock_workstation
from actions.alarm_player import alarm_controller
from actions.camera_streamer import camera_streamer
from actions.snapshot_taker import take_security_snapshot
from offline_queue import OfflineEventQueue
from modern_gui import ModernAgentGUI
from packages.security.signer import verify_command_envelope
import websockets

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("LaptopGuard.App")

def is_ws_connected(ws) -> bool:
    if not ws:
        return False
    try:
        from websockets.protocol import State
        return getattr(ws, "state", None) == State.OPEN
    except Exception:
        return True

class LaptopGuardDesktopApp:
    def __init__(self):
        self.device_id = DEVICE_ID
        self.device_name = DEVICE_NAME
        self.is_armed = True
        self.is_connected = False
        self.ws = None
        self.loop = None
        
        self.offline_queue = OfflineEventQueue(str(LOCAL_QUEUE_FILE))
        
        # Hardware Monitors
        self.power_monitor = PowerMonitor(on_power_event=self.on_security_event)
        self.network_monitor = NetworkMonitor(on_network_event=self.on_security_event)
        self.movement_detector = MovementDetector(on_movement_event=self.on_security_event)
        self.login_monitor = LoginMonitor(on_login_event=self.on_security_event)
        
        # Alarm callback
        alarm_controller.on_state_change = self._on_alarm_state_changed

        # Initialize Modern GUI
        self.gui = ModernAgentGUI(
            on_arm=self.arm_device,
            on_disarm=self.disarm_device,
            on_test_alarm=self.test_alarm,
            on_test_motion=self.test_motion,
            on_stop_alarm=alarm_controller.stop_alarm,
            on_lock_device=self.lock_workstation_now,
            on_authenticated=self._on_user_authenticated,
            device_name=self.device_name
        )

    def _on_user_authenticated(self, user_id: str, token: str):
        logger.info(f"User authenticated on desktop: {user_id}")
        self.gui.log_event(f"Linked to account {self.gui.user_email}.")
        if self.ws and self.loop:
            try:
                asyncio.run_coroutine_threadsafe(self.ws.close(), self.loop)
            except Exception:
                pass

    def _on_alarm_state_changed(self, is_active: bool):
        logger.info(f"Alarm siren active state: {is_active}")
        if is_active:
            self.gui.log_event("Deterrence siren activated (Auto-timeout: 15s).")
        else:
            self.gui.log_event("Deterrence siren silenced.")

        if is_ws_connected(self.ws) and self.loop:
            msg = json.dumps({
                "type": "ALARM_STATE",
                "is_alarm_active": is_active,
                "device_id": self.device_id
            })
            asyncio.run_coroutine_threadsafe(self.ws.send(msg), self.loop)

    def arm_device(self):
        logger.info("Device ARMED by user.")
        self.is_armed = True
        p_state = self.power_monitor.check_power_state(self.is_armed)
        self.gui.update_telemetry(p_state["battery_percent"], p_state["is_charging"], self.network_monitor.last_ssid or "Wi-Fi", True)
        self.gui.log_event("Security sentinel ARMED in Balanced Mode.")
        self.on_security_event("ARMED", "INFO", {"message": "Laptop armed and monitoring power line."})

    def disarm_device(self):
        logger.info("Device DISARMED by user.")
        self.is_armed = False
        p_state = self.power_monitor.check_power_state(self.is_armed)
        self.gui.update_telemetry(p_state["battery_percent"], p_state["is_charging"], self.network_monitor.last_ssid or "Wi-Fi", False)
        self.gui.log_event("Security sentinel DISARMED by user.")
        self.on_security_event("DISARMED", "INFO", {"message": "Laptop disarmed."})

    def test_alarm(self):
        self.gui.log_event("Manual alarm test triggered.")
        alarm_controller.play_alarm(duration=15)

    def test_motion(self):
        self.gui.log_event("Testing physical movement sensor...")
        self.on_security_event("MOVEMENT_DETECTED", "WARNING", {"details": "Manual sensor test trigger."})

    def lock_workstation_now(self):
        self.gui.log_event("Executing user32.LockWorkStation...")
        lock_workstation()

    def on_security_event(self, event_type: str, severity: str, details: dict):
        logger.warning(f"Security Event: {event_type} [{severity}] - {details}")
        self.gui.log_event(f"{event_type}: {details.get('message', str(details))}")

        # If AC unplugged while armed, trigger siren
        if event_type == "POWER_DISCONNECTED" and self.is_armed:
            self.gui.log_event("AC power unplugged while armed! Sounding siren.")
            alarm_controller.play_alarm(duration=15)

        envelope = {
            "type": "SECURITY_EVENT",
            "device_id": self.device_id,
            "data": {
                "event_type": event_type,
                "severity": severity,
                "description": details.get("message", "Security event detected"),
                "metadata": details,
                "timestamp": time.time()
            }
        }

        if is_ws_connected(self.ws) and self.loop:
            asyncio.run_coroutine_threadsafe(self.ws.send(json.dumps(envelope)), self.loop)
        else:
            self.offline_queue.enqueue(envelope)

    def _start_power_watchdog(self):
        def loop():
            while True:
                try:
                    p = self.power_monitor.check_power_state(self.is_armed)
                    self.gui.update_telemetry(
                        p["battery_percent"],
                        p["is_charging"],
                        self.network_monitor.last_ssid or "Wi-Fi",
                        self.is_armed
                    )
                except Exception as e:
                    logger.error(f"Watchdog error: {e}")
                time.sleep(0.5)

        t = threading.Thread(target=loop, daemon=True)
        t.start()

    async def _handle_command(self, cmd_data: dict):
        command_id = cmd_data.get("command_id")
        action = (cmd_data.get("command_type") or cmd_data.get("action") or "").upper()
        payload = cmd_data.get("payload", {})

        is_valid, reason = verify_command_envelope(cmd_data)
        if not is_valid:
            logger.error(f"Command failed cryptographic verification: {reason}")
            return

        self.gui.log_event(f"Cloud command received: {action}")
        logger.info(f"Executing verified command: {action}")

        if action in ("LOCK_DEVICE", "LOCK"):
            self.lock_workstation_now()
        elif action in ("PLAY_ALARM", "TRIGGER_ALARM"):
            alarm_controller.play_alarm(duration=15)
        elif action in ("STOP_ALARM", "SILENCE_ALARM"):
            alarm_controller.stop_alarm()
        elif action in ("ARM", "ARM_DEVICE"):
            self.arm_device()
        elif action in ("DISARM", "DISARM_DEVICE"):
            self.disarm_device()
        elif action in ("TAKE_SECURITY_SNAPSHOT", "SNAPSHOT"):
            take_security_snapshot(self.device_id, "REMOTE_REQUEST")

        if is_ws_connected(self.ws):
            try:
                await self.ws.send(json.dumps({
                    "type": "COMMAND_RESULT",
                    "command_id": command_id,
                    "status": "EXECUTED"
                }))
            except Exception:
                pass

    async def _run_ws_client(self):
        ws_url = f"{BACKEND_WS_URL}/device/{self.device_id}"
        while True:
            try:
                logger.info(f"Connecting to Cloud Hub: {ws_url}...")
                async with websockets.connect(ws_url) as websocket:
                    self.ws = websocket
                    self.is_connected = True
                    logger.info("Connected to Cloud Hub successfully.")
                    if self.gui.cloud_badge:
                        self.gui.cloud_badge.configure(text="● CLOUD SYNC ACTIVE", text_color="#10B981")

                    # Automatically bind device to logged in user on cloud hub
                    if getattr(self.gui, 'user_token', None):
                        try:
                            await websocket.send(json.dumps({
                                "type": "CLAIM_DEVICE",
                                "token": self.gui.user_token,
                                "email": getattr(self.gui, 'user_email', '')
                            }))
                            logger.info("Sent CLAIM_DEVICE envelope to Cloud Hub.")
                        except Exception:
                            pass

                    async def heartbeat_sender():
                        while is_ws_connected(self.ws):
                            try:
                                p = self.power_monitor.check_power_state(self.is_armed)
                                hb_msg = json.dumps({
                                    "type": "HEARTBEAT",
                                    "battery": p["battery_percent"],
                                    "is_charging": p["is_charging"],
                                    "current_ssid": self.network_monitor.last_ssid or "Wi-Fi",
                                    "ip_address": "127.0.0.1"
                                })
                                await self.ws.send(hb_msg)
                            except Exception:
                                break
                            await asyncio.sleep(2)

                    hb_task = asyncio.create_task(heartbeat_sender())
                    
                    try:
                        async for message in websocket:
                            try:
                                data = json.loads(message)
                                if data.get("type") == "EXECUTE_COMMAND":
                                    await self._handle_command(data.get("data", {}))
                            except Exception as e:
                                logger.error(f"Error handling message: {e}")
                    finally:
                        hb_task.cancel()

            except Exception as e:
                logger.warning(f"WebSocket reconnecting in 5s... ({e})")
                self.is_connected = False
                if self.gui.cloud_badge:
                    self.gui.cloud_badge.configure(text="○ OFFLINE (LOCAL QUEUE)", text_color="#EF4444")
                await asyncio.sleep(5)

    def start(self):
        self._start_power_watchdog()

        def run_async():
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            self.loop.run_until_complete(self._run_ws_client())

        t = threading.Thread(target=run_async, daemon=True)
        t.start()

        self.gui.start_gui()

if __name__ == "__main__":
    app = LaptopGuardDesktopApp()
    app.start()
