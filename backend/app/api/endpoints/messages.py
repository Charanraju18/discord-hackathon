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

def _user_dict(u) -> dict:
    return {"id": str(u.id), "username": u.username, "email": u.email, "isOnline": u.isOnline}

def _attachment_dict(a) -> dict:
    return {"url": a.url, "publicId": a.publicId, "fileName": a.fileName, "fileSize": a.fileSize, "mimeType": a.mimeType, "resourceType": a.resourceType, "uploadedAt": str(a.uploadedAt) if a.uploadedAt else None}

async def _resolve_reactions(reactions):
    if not reactions:
        return []
    
    user_ids = set()
    for r in reactions:
        user_ids.update(r.users)
        
    users = await User.find({"_id": {"$in": [ObjectId(uid) for uid in user_ids]}}).to_list()
    user_map = {str(u.id): u.username for u in users}
    
    resolved = []
    for r in reactions:
        resolved_users = [{"id": uid, "username": user_map.get(uid, "Unknown User")} for uid in r.users]
        resolved.append({"emoji": r.emoji, "users": resolved_users})
    return resolved

async def _msg_dict(m, sender) -> dict:
    resolved_reactions = await _resolve_reactions(getattr(m, 'reactions', []))
    return {
        "id": str(m.id),
        "channelId": str(m.channelId),
        "serverId": str(m.serverId) if hasattr(m, 'serverId') and m.serverId else None,
        "sender": _user_dict(sender) if sender else None,
        "content": m.content,
        "isEdited": m.isEdited,
        "editedAt": str(m.editedAt) if m.editedAt else None,
        "deleted": m.deleted,
        "deletedAt": str(m.deletedAt) if m.deletedAt else None,
        "attachments": [_attachment_dict(a) for a in m.attachments],
        "reactions": resolved_reactions,
        "createdAt": str(m.createdAt),
        "updatedAt": str(m.updatedAt)
    }

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
        msg_dict = await _msg_dict(m, sender)
        results.append(msg_dict)
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
    payload = await _msg_dict(msg, sender)
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
    payload = await _msg_dict(msg, sender)
    await sio.emit("message-deleted", payload, room=str(msg.channelId))
    return payload
