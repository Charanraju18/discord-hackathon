import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio

from app.db.database import init_db
from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    print("Database connected")
    yield
    # Shutdown

app = FastAPI(title="Discord Clone API", lifespan=lifespan, redirect_slashes=False)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Socket.IO
from app.sockets import sio, events
socket_app = socketio.ASGIApp(sio, app)

from app.api.endpoints import auth, users, friends, dms, servers, channels, invites, messages, upload

@app.get("/")
async def root():
    return {"message": "FastAPI backend is running"}

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(friends.router, prefix="/api/friends", tags=["friends"])
app.include_router(dms.router, prefix="/api/dms", tags=["dms"])
app.include_router(servers.router, prefix="/api/servers", tags=["servers"])
app.include_router(channels.router, prefix="/api/channels", tags=["channels"])
app.include_router(invites.router, prefix="/api/invites", tags=["invites"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
app.include_router(upload.router, prefix="/api/upload", tags=["upload"])


# We can run it via `uvicorn main:socket_app --host 0.0.0.0 --port 8000`
