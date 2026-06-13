from typing import Dict, Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # user_id -> set of websockets
        self.active: Dict[str, Set[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()

        if user_id not in self.active:
            self.active[user_id] = set()

        self.active[user_id].add(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        if user_id not in self.active:
            return

        self.active[user_id].discard(ws)

        if len(self.active[user_id]) == 0:
            self.active.pop(user_id, None)

    async def send_to(self, user_id: str, data: dict) -> bool:
        """
        Sends to ANY valid socket of user.
        Removes dead sockets automatically.
        """
        if user_id not in self.active:
            return False

        dead = []
        delivered = False

        for ws in self.active[user_id]:
            try:
                await ws.send_json(data)
                delivered = True
            except Exception:
                dead.append(ws)

        for ws in dead:
            self.active[user_id].discard(ws)

        if len(self.active.get(user_id, [])) == 0:
            self.active.pop(user_id, None)

        return delivered

    def is_online(self, user_id: str) -> bool:
        return bool(self.active.get(user_id))


manager = ConnectionManager()