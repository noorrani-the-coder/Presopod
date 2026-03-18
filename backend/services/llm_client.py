import os
from threading import Lock

from cerebras.cloud.sdk import Cerebras
from config import Config


class RoundRobinCerebrasClient:
    def __init__(self):
        self._lock = Lock()
        self._next_index = 0

    def _get_keys(self):
        keys = []

        primary_key = os.getenv("CEREBRAS_API_KEY", "").strip()
        if primary_key:
            keys.append(primary_key)

        for idx in range(1, 5):
            key = os.getenv(f"CEREBRAS_API_KEY_{idx}", "").strip()
            if key and key not in keys:
                keys.append(key)

        if not keys:
            raise RuntimeError(
                "No Cerebras API keys configured. Add CEREBRAS_API_KEY or CEREBRAS_API_KEY_1 ... CEREBRAS_API_KEY_4."
            )
        return keys

    def _reserve_start_index(self, key_count):
        with self._lock:
            start_index = self._next_index % key_count
            self._next_index = (self._next_index + 1) % key_count
            return start_index

    def create_chat_completion(self, **kwargs):
        keys = self._get_keys()
        start_index = self._reserve_start_index(len(keys))
        last_error = None

        for offset in range(len(keys)):
            current_index = (start_index + offset) % len(keys)
            client = Cerebras(api_key=keys[current_index], max_retries=0)
            try:
                request_kwargs = {
                    "model": Config.CEREBRAS_MODEL,
                    **kwargs,
                }
                return client.chat.completions.create(**request_kwargs)
            except Exception as exc:
                last_error = exc
                continue

        raise RuntimeError(
            f"All configured Cerebras API keys failed after {len(keys)} attempts."
        ) from last_error


cerebras_chat = RoundRobinCerebrasClient()
