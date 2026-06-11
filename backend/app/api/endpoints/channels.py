from fastapi import APIRouter, Depends, HTTPException
from typing import List
from beanie import PydanticObjectId as ObjectId

from app.models.user import User
from app.models.server import Server
from app.models.channel import Channel
from app.schemas.server import ChannelCreate, ChannelResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/{server_id}")
async def get_channels(
    server_id: str,
    current_user: User = Depends(get_current_user)
):
    s_id = ObjectId(server_id)
    server = await Server.get(s_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
        
    if current_user.id not in server.members:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    channels = await Channel.find({"serverId": s_id}).to_list()
    return [
        {
            "id": str(c.id),
            "serverId": str(c.serverId),
            "name": c.name,
            "type": c.type,
            "createdAt": str(c.createdAt),
            "updatedAt": str(c.updatedAt)
        } for c in channels
    ]

@router.post("")
async def create_channel(
    req: dict, # expecting { serverId: str, name: str, type: str }
    current_user: User = Depends(get_current_user)
):
    server_id = ObjectId(req.get("serverId"))
    server = await Server.get(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
        
    if current_user.id not in server.members:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    new_channel = Channel(
        serverId=server_id,
        name=req.get("name"),
        type=req.get("type", "text")
    )
    await new_channel.insert()
    return {
        "id": str(new_channel.id),
        "serverId": str(new_channel.serverId),
        "name": new_channel.name,
        "type": new_channel.type,
        "createdAt": str(new_channel.createdAt),
        "updatedAt": str(new_channel.updatedAt)
    }
