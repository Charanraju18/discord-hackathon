from fastapi import APIRouter, Depends, HTTPException
from typing import List
from beanie import PydanticObjectId as ObjectId
from datetime import datetime

from app.models.user import User
from app.models.channel import Channel
from app.models.message import Message
from app.schemas.message import MessageEditRequest
from app.api.deps import get_current_user
from app.sockets import sio

router = APIRouter()

@router.get("/{channel_id}")
async def get_messages(
    channel_id: str,
    current_user: User = Depends(get_current_user)
):
    c_id = ObjectId(channel_id)
    channel = await Channel.get(c_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
        
    messages = await Message.find({"channelId": c_id, "deleted": {"$ne": True}}).sort("createdAt").to_list()
    results = []
    for m in messages:
        sender = await User.get(m.senderId)
        if sender:
            results.append({
                "id": str(m.id),
                "channelId": str(m.channelId),
                "serverId": str(m.serverId),
                "sender": sender.model_dump(),
                "content": m.content,
                "isEdited": m.isEdited,
                "editedAt": str(m.editedAt) if m.editedAt else None,
                "deleted": m.deleted,
                "deletedAt": str(m.deletedAt) if m.deletedAt else None,
                "attachments": [a.model_dump() for a in m.attachments],
                "createdAt": str(m.createdAt),
                "updatedAt": str(m.updatedAt)
            })
    return results

@router.put("/{message_id}")
async def edit_message(
    message_id: str,
    req: MessageEditRequest,
    current_user: User = Depends(get_current_user)
):
    msg = await Message.get(ObjectId(message_id))
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    if msg.senderId != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own messages")
        
    if msg.deleted:
        raise HTTPException(status_code=400, detail="Cannot edit a deleted message")
        
    msg.content = req.content
    msg.isEdited = True
    msg.editedAt = datetime.utcnow()
    msg.updatedAt = datetime.utcnow()
    await msg.save()
    
    sender = await User.get(current_user.id)
    payload = {
        "id": str(msg.id),
        "channelId": str(msg.channelId),
        "serverId": str(msg.serverId),
        "sender": sender.model_dump() if sender else None,
        "content": msg.content,
        "isEdited": msg.isEdited,
        "editedAt": str(msg.editedAt),
        "deleted": msg.deleted,
        "attachments": [a.model_dump() for a in msg.attachments],
        "createdAt": str(msg.createdAt),
        "updatedAt": str(msg.updatedAt)
    }
    await sio.emit("message-updated", payload, room=str(msg.channelId))
    
    return payload

@router.delete("/{message_id}")
async def delete_message(
    message_id: str,
    current_user: User = Depends(get_current_user)
):
    msg = await Message.get(ObjectId(message_id))
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    if msg.senderId != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own messages")
        
    if msg.deleted:
        raise HTTPException(status_code=400, detail="Message is already deleted")
        
    msg.deleted = True
    msg.deletedAt = datetime.utcnow()
    await msg.save()
    
    sender = await User.get(current_user.id)
    payload = {
        "id": str(msg.id),
        "channelId": str(msg.channelId),
        "serverId": str(msg.serverId),
        "sender": sender.model_dump() if sender else None,
        "content": "Message deleted",
        "isEdited": msg.isEdited,
        "editedAt": str(msg.editedAt) if msg.editedAt else None,
        "deleted": msg.deleted,
        "deletedAt": str(msg.deletedAt),
        "attachments": [a.model_dump() for a in msg.attachments],
        "createdAt": str(msg.createdAt),
        "updatedAt": str(msg.updatedAt)
    }
    await sio.emit("message-deleted", payload, room=str(msg.channelId))
    
    return payload
