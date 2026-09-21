import json
import os
import base64
import logging
from typing import List, Dict, Any

logger = logging.getLogger("LaptopGuard.OfflineQueue")

class OfflineEventQueue:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self._ensure_file()

    def _ensure_file(self):
        if not os.path.exists(self.file_path):
            self._save_raw([])

    def _xor_cipher(self, data: bytes) -> bytes:
        key = b"laptopguard_offline_key_2026"
        return bytes([b ^ key[i % len(key)] for i, b in enumerate(data)])

    def _save_raw(self, items: List[Dict[str, Any]]):
        try:
            raw_bytes = json.dumps(items).encode("utf-8")
            enc_bytes = self._xor_cipher(raw_bytes)
            b64_str = base64.b64encode(enc_bytes).decode("ascii")
            with open(self.file_path, "w", encoding="utf-8") as f:
                f.write(b64_str)
        except Exception as e:
            logger.error(f"Error saving offline queue: {e}")

    def get_queued_events(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.file_path):
            return []
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
            if not content:
                return []
            enc_bytes = base64.b64decode(content.encode("ascii"))
            raw_bytes = self._xor_cipher(enc_bytes)
            return json.loads(raw_bytes.decode("utf-8"))
        except Exception as e:
            logger.error(f"Error reading offline queue: {e}")
            return []

    def enqueue(self, event_data: Dict[str, Any]):
        items = self.get_queued_events()
        items.append(event_data)
        self._save_raw(items)
        logger.info(f"Queued event offline (Total queued: {len(items)})")

    def clear(self):
        self._save_raw([])
