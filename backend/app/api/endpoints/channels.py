from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from beanie import PydanticObjectId as ObjectId

from app.models.user import User
from app.models.server import Server
from app.models.channel import Channel
from app.models.category import Category
from app.api.deps import get_current_user
from app.sockets import sio

router = APIRouter()

def _ch_dict(c: Channel) -> dict:
    return {
        "id": str(c.id),
        "serverId": str(c.serverId),
        "name": c.name,
        "type": c.type,
        "categoryId": str(c.categoryId) if c.categoryId else None,
        "position": c.position,
        "createdAt": str(c.createdAt),
        "updatedAt": str(c.updatedAt),
    }

@router.get("/{server_id}")
async def get_channels(server_id: str, current_user: User = Depends(get_current_user)):
    s_id = ObjectId(server_id)
    server = await Server.get(s_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    if current_user.id not in server.members:
        raise HTTPException(status_code=403, detail="Not authorized")
    channels = await Channel.find({"serverId": s_id}).to_list()
    return [_ch_dict(c) for c in channels]

@router.post("")
async def create_channel(req: dict, current_user: User = Depends(get_current_user)):
    server_id = ObjectId(req.get("serverId"))
    server = await Server.get(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    if current_user.id not in server.members:
        raise HTTPException(status_code=403, detail="Not authorized")
    cat_id_raw = req.get("categoryId")
    category_id = ObjectId(cat_id_raw) if cat_id_raw else None
    count = await Channel.find({"serverId": server_id}).count()
    new_channel = Channel(
        serverId=server_id,
        name=req.get("name"),
        type=req.get("type", "text"),
        categoryId=category_id,
        position=count,
    )
    await new_channel.insert()
    payload = _ch_dict(new_channel)
    await sio.emit("channel_created", payload, room=f"server:{str(server_id)}")
    return payload

@router.delete("/{channel_id}")
async def delete_channel(channel_id: str, current_user: User = Depends(get_current_user)):
    channel = await Channel.get(ObjectId(channel_id))
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    server = await Server.get(channel.serverId)
    if not server or current_user.id not in server.members:
        raise HTTPException(status_code=403, detail="Not authorized")
    server_id_str = str(channel.serverId)
    await channel.delete()
    await sio.emit("channel_deleted", {"channelId": channel_id, "serverId": server_id_str}, room=f"server:{server_id_str}")
    return {"success": True}
