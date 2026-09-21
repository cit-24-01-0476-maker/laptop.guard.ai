import asyncio
import json
import logging
import threading
import time
import os
import sys
from pathlib import Path
import requests
import websockets

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(Path(__file__).resolve().parent))

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
from gui import AgentGUI
from packages.security.signer import verify_command_envelope

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("LaptopGuard.Agent")

def is_ws_connected(ws) -> bool:
    """Safely checks if websockets ClientConnection is active across all library versions."""
    if not ws:
        return False
    try:
        from websockets.protocol import State
        return getattr(ws, "state", None) == State.OPEN
    except Exception:
        return True

class LaptopSecurityAgent:
    def __init__(self):
        self.device_id = DEVICE_ID
        self.device_name = DEVICE_NAME
        self.is_armed = True
        self.is_connected = False
        self.ws = None
        self.loop = None
        
        self.offline_queue = OfflineEventQueue(str(LOCAL_QUEUE_FILE))
        
        # Initialize Monitors with callbacks
        self.power_monitor = PowerMonitor(on_power_event=self.on_security_event)
        self.network_monitor = NetworkMonitor(on_network_event=self.on_security_event)
        self.movement_detector = MovementDetector(on_movement_event=self.on_security_event)
        self.login_monitor = LoginMonitor(on_login_event=self.on_security_event)
        
        # Wire alarm state change callback
        alarm_controller.on_state_change = self._on_alarm_state_changed

        # Initialize GUI
        self.gui = AgentGUI(
            on_arm=self.arm_device,
            on_disarm=self.disarm_device,
            on_test_alarm=self.test_alarm,
            on_test_motion=self.test_motion,
            on_stop_alarm=alarm_controller.stop_alarm
        )

    def _on_alarm_state_changed(self, is_active: bool):
        logger.info(f"Alarm siren active state changed: {is_active}")
        if is_active:
            self.gui.log_event("Siren active (Auto-timeout: 15s).")
        else:
            self.gui.log_event("Siren silenced.")

        if is_ws_connected(self.ws) and self.loop:
            msg = json.dumps({
                "type": "ALARM_STATE",
                "is_alarm_active": is_active,
                "device_id": self.device_id
            })
            asyncio.run_coroutine_threadsafe(self.ws.send(msg), self.loop)

    def arm_device(self):
        logger.info("Device ARMED by owner.")
        self.is_armed = True
        p_state = self.power_monitor.check_power_state(self.is_armed)
        self.gui.update_telemetry(p_state["battery_percent"], p_state["is_charging"], self.network_monitor.last_ssid or "Wi-Fi", True)
        self.gui.log_event("Device armed in Balanced Mode.")
        self.on_security_event("ARMED", "INFO", {"message": "Laptop armed and monitoring power/network."})

    def disarm_device(self):
        logger.info("Device DISARMED by owner.")
        self.is_armed = False
        alarm_controller.stop_alarm()
        p_state = self.power_monitor.check_power_state(self.is_armed)
        self.gui.update_telemetry(p_state["battery_percent"], p_state["is_charging"], self.network_monitor.last_ssid or "Wi-Fi", False)
        self.gui.log_event("Device disarmed.")
        self.on_security_event("DISARMED", "INFO", {"message": "Laptop disarmed."})

    def test_alarm(self):
        logger.warning("Testing alarm from GUI...")
        alarm_controller.start_alarm()

    def test_motion(self):
        self.movement_detector.trigger_simulated_motion(self.is_armed)

    def on_security_event(self, event_type: str, severity: str, details: dict):
        """Called when a monitor detects an anomaly."""
        payload = {
            "device_id": self.device_id,
            "event_type": event_type,
            "severity": severity,
            "description": details.get("message", f"Security signal: {event_type}"),
            "metadata_json": json.dumps(details)
        }
        
        self.gui.log_event(f"[{severity}] {event_type}: {payload['description']}")

        # If power is disconnected while armed, sound the local alarm siren immediately on laptop!
        if event_type == "POWER_DISCONNECT" and severity == "CRITICAL":
            logger.warning("Local power disconnection trigger: Activating deterrence siren!")
            alarm_controller.start_alarm()

        # If power is reconnected, auto-rearm protection after 2 seconds
        if event_type == "POWER_CONNECTED":
            def auto_rearm():
                time.sleep(2)
                if not self.is_armed and self.power_monitor.last_charging:
                    logger.info("Charger connected and stable: Automatically re-arming Sentinel protection...")
                    self.arm_device()
            threading.Thread(target=auto_rearm, daemon=True).start()

        # Attempt to push to backend REST API or enqueue offline
        try:
            res = requests.post(f"{BACKEND_HTTP_URL}/events/report", json=payload, timeout=3)
            if res.status_code != 200:
                self.offline_queue.enqueue(payload)
        except Exception:
            self.offline_queue.enqueue(payload)

    def _start_power_watchdog(self):
        """Dedicated high-frequency (500ms) hardware power line monitor."""
        def watchdog_loop():
            logger.info("High-frequency hardware AC power line watchdog active (500ms polling).")
            while True:
                try:
                    self.power_monitor.check_power_state(self.is_armed)
                except Exception as e:
                    logger.error(f"Error in power watchdog: {e}")
                time.sleep(0.5)
                
        t = threading.Thread(target=watchdog_loop, daemon=True)
        t.start()

    async def _send_heartbeat(self):
        """Sends battery and network telemetry to Cloud every 2 seconds."""
        while True:
            try:
                if is_ws_connected(self.ws):
                    p_state = self.power_monitor.check_power_state(self.is_armed)
                    n_state = self.network_monitor.check_network_state(self.is_armed)
                    
                    # Update local GUI
                    self.gui.update_telemetry(
                        p_state["battery_percent"],
                        p_state["is_charging"],
                        n_state["current_ssid"],
                        self.is_armed
                    )

                    heartbeat_msg = {
                        "type": "HEARTBEAT",
                        "battery": p_state["battery_percent"],
                        "is_charging": p_state["is_charging"],
                        "current_ssid": n_state["current_ssid"],
                        "ip_address": n_state["ip_address"]
                    }
                    await self.ws.send(json.dumps(heartbeat_msg))
                    
                    # Flush any offline queued events
                    queued = self.offline_queue.get_queued_events()
                    if queued:
                        for item in queued:
                            try:
                                requests.post(f"{BACKEND_HTTP_URL}/events/report", json=item, timeout=2)
                            except Exception:
                                break
                        self.offline_queue.clear()
                        logger.info("Synchronized offline event buffer with Cloud.")

            except Exception as e:
                logger.debug(f"Heartbeat loop error: {e}")
                
            await asyncio.sleep(2)

    async def _handle_command(self, command_envelope: dict):
        """Validates and executes signed remote commands from Cloud."""
        # 1. Cryptographic validation
        is_valid, reason = verify_command_envelope(command_envelope)
        cmd_id = command_envelope.get("command_id", "")
        cmd_type = command_envelope.get("command_type", "")
        
        if not is_valid:
            logger.error(f"Rejected invalid command envelope {cmd_id}: {reason}")
            await self._report_command_result(cmd_id, "FAILED")
            return

        logger.info(f"Executing verified command: {cmd_type} (ID: {cmd_id})")
        self.gui.log_event(f"Executing verified remote command: {cmd_type}")

        if cmd_type == "LOCK_DEVICE":
            success = lock_workstation()
            await self._report_command_result(cmd_id, "EXECUTED" if success else "FAILED")
            self.on_security_event("REMOTE_LOCK", "INFO", {"message": "Remote lock executed successfully."})

        elif cmd_type == "PLAY_ALARM":
            alarm_controller.start_alarm()
            await self._report_command_result(cmd_id, "EXECUTED")
            self.on_security_event("ALARM_TRIGGERED", "CRITICAL", {"message": "Remote deterrence siren sounded."})

        elif cmd_type == "STOP_ALARM":
            alarm_controller.stop_alarm()
            await self._report_command_result(cmd_id, "EXECUTED")

        elif cmd_type == "ARM_DEVICE":
            self.arm_device()
            await self._report_command_result(cmd_id, "EXECUTED")

        elif cmd_type == "DISARM_DEVICE":
            self.disarm_device()
            await self._report_command_result(cmd_id, "EXECUTED")

        elif cmd_type == "ENABLE_LOST_MODE":
            self.is_armed = True
            self.gui.log_event("LOST MODE ACTIVATED REMOTELY!")
            alarm_controller.start_alarm()
            await self._report_command_result(cmd_id, "EXECUTED")
            self.on_security_event("LOST_MODE_ENABLED", "CRITICAL", {"message": "Lost Mode activated by owner."})

        elif cmd_type == "TAKE_SECURITY_SNAPSHOT":
            evi_id = take_security_snapshot(BACKEND_HTTP_URL, self.device_id, "REMOTE_COMMAND")
            await self._report_command_result(cmd_id, "EXECUTED" if evi_id else "FAILED")

        elif cmd_type == "START_CAMERA_SESSION":
            sess_id = command_envelope.get("payload", {}).get("session_id", "session_001")
            camera_streamer.start_stream(sess_id)
            await self._report_command_result(cmd_id, "EXECUTED")

        elif cmd_type == "STOP_CAMERA_SESSION":
            camera_streamer.stop_stream("USER_STOPPED")
            await self._report_command_result(cmd_id, "EXECUTED")

    async def _report_command_result(self, command_id: str, status: str):
        if is_ws_connected(self.ws):
            try:
                await self.ws.send(json.dumps({
                    "type": "COMMAND_RESULT",
                    "command_id": command_id,
                    "status": status
                }))
            except Exception as e:
                logger.debug(f"Report command result error: {e}")

    async def _run_ws_client(self):
        ws_url = f"{BACKEND_WS_URL}/device/{self.device_id}"
        while True:
            try:
                logger.info(f"Connecting to LaptopGuard Cloud Hub: {ws_url}...")
                async with websockets.connect(ws_url) as websocket:
                    self.ws = websocket
                    self.is_connected = True
                    logger.info("Connected to LaptopGuard Cloud Hub successfully.")
                    if self.gui.connection_var:
                        self.gui.connection_var.set("Connected to Cloud")
                    
                    heartbeat_task = asyncio.create_task(self._send_heartbeat())
                    
                    async for message in websocket:
                        try:
                            data = json.loads(message)
                            if data.get("type") == "EXECUTE_COMMAND":
                                await self._handle_command(data.get("data", {}))
                        except Exception as e:
                            logger.error(f"Error handling message: {e}")
                            
                    heartbeat_task.cancel()

            except Exception as e:
                logger.warning(f"WebSocket disconnected, reconnecting in 5s... ({e})")
                self.is_connected = False
                if self.gui.connection_var:
                    self.gui.connection_var.set("Offline (Queuing Locally)")
                await asyncio.sleep(5)

    def start(self):
        # 1. Start dedicated AC power hardware watchdog
        self._start_power_watchdog()

        # 2. Start async worker in a background daemon thread
        def run_async():
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            self.loop.run_until_complete(self._run_ws_client())

        t = threading.Thread(target=run_async, daemon=True)
        t.start()

        # 3. Start native GUI in main thread
        self.gui.start_gui()

if __name__ == "__main__":
    agent = LaptopSecurityAgent()
    agent.start()
