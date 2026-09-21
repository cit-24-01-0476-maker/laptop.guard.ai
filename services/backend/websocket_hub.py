import json
import logging
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger("LaptopGuard.WSHub")

class ConnectionHub:
    def __init__(self):
        # Map of device_id -> WebSocket (Agent connection)
        self.active_devices: Dict[str, WebSocket] = {}
        # Map of user_id -> Set of WebSockets (Web Dashboards & Mobile Apps)
        self.active_clients: Dict[str, Set[WebSocket]] = {}
        # Map of device_id -> user_id
        self.device_user_map: Dict[str, str] = {}

    async def register_device(self, device_id: str, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_devices[device_id] = websocket
        self.device_user_map[device_id] = user_id
        logger.info(f"Laptop Agent connected: {device_id} (User: {user_id})")
        # Notify user clients that device is Online
        await self.broadcast_to_user(user_id, {
            "type": "DEVICE_STATUS_CHANGED",
            "device_id": device_id,
            "status": "Online",
            "is_online": True
        })

    def unregister_device(self, device_id: str):
        if device_id in self.active_devices:
            del self.active_devices[device_id]
        user_id = self.device_user_map.get(device_id)
        logger.info(f"Laptop Agent disconnected: {device_id}")
        return user_id

    async def register_client(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_clients:
            self.active_clients[user_id] = set()
        self.active_clients[user_id].add(websocket)
        logger.info(f"Client connected for user: {user_id}")

    def unregister_client(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_clients and websocket in self.active_clients[user_id]:
            self.active_clients[user_id].remove(websocket)
            if not self.active_clients[user_id]:
                del self.active_clients[user_id]
        logger.info(f"Client disconnected for user: {user_id}")

    def is_device_online(self, device_id: str) -> bool:
        return device_id in self.active_devices

    async def send_command_to_device(self, device_id: str, command_envelope: dict) -> bool:
        ws = self.active_devices.get(device_id)
        if ws:
            try:
                await ws.send_text(json.dumps({
                    "type": "EXECUTE_COMMAND",
                    "data": command_envelope
                }))
                return True
            except Exception as e:
                logger.error(f"Failed to send command to device {device_id}: {e}")
                return False
        return False

    async def broadcast_to_user(self, user_id: str, message: dict):
        # Broadcast to specific user and all active dashboard clients
        target_sockets = set()
        if user_id in self.active_clients:
            target_sockets.update(self.active_clients[user_id])
        for uid, sock_set in self.active_clients.items():
            target_sockets.update(sock_set)

        dead_clients = set()
        for ws in target_sockets:
            try:
                await ws.send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"Error broadcasting to client: {e}")
                dead_clients.add(ws)
        for dead in dead_clients:
            for sock_set in self.active_clients.values():
                sock_set.discard(dead)

    async def relay_webrtc_signaling(self, target_type: str, target_id: str, payload: dict):
        """Relays SDP offer/answer or ICE candidate between client and device agent."""
        if target_type == "device":
            ws = self.active_devices.get(target_id)
            if ws:
                await ws.send_text(json.dumps({
                    "type": "WEBRTC_SIGNAL",
                    "payload": payload
                }))
        elif target_type == "user":
            await self.broadcast_to_user(target_id, {
                "type": "WEBRTC_SIGNAL",
                "payload": payload
            })

hub = ConnectionHub()
