from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List
from beanie import PydanticObjectId as ObjectId
from datetime import datetime

from app.models.user import User
from app.models.direct_conversation import DirectConversation
from app.models.direct_message import DirectMessage
from app.schemas.dm import StartDMRequest, DirectConversationResponse, DirectMessageResponse, DirectMessageCreate
from app.schemas.message import MessageEditRequest
from app.api.deps import get_current_user
from app.sockets import sio

router = APIRouter()

@router.post("/start")
async def start_conversation(
    req: StartDMRequest,
    current_user: User = Depends(get_current_user)
):
    friend_id = ObjectId(req.friendId)
    if friend_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot DM yourself")

    # Check if conversation already exists
    conv = await DirectConversation.find_one({
        "participants": {"$all": [current_user.id, friend_id]}
    })
    
    if conv:
        # Populate participants
        participants = []
        for pid in conv.participants:
            p_user = await User.get(pid)
            if p_user:
                participants.append(p_user)
        
        return {
            "id": str(conv.id),
            "participants": participants,
            "lastMessageId": str(conv.lastMessageId) if conv.lastMessageId else None,
            "createdAt": conv.createdAt,
            "updatedAt": conv.updatedAt
        }
        
    # Create new conversation
    new_conv = DirectConversation(participants=[current_user.id, friend_id])
    await new_conv.insert()
    
    participants = []
    for pid in new_conv.participants:
        p_user = await User.get(pid)
        if p_user:
            participants.append(p_user)
            
    return {
        "id": str(new_conv.id),
        "participants": participants,
        "lastMessageId": None,
        "createdAt": new_conv.createdAt,
        "updatedAt": new_conv.updatedAt
    }

@router.get("/")
async def get_conversations(current_user: User = Depends(get_current_user)):
    conversations = await DirectConversation.find({"participants": current_user.id}).sort("-updatedAt").to_list()
    
    results = []
    for conv in conversations:
        participants = []
        for pid in conv.participants:
            p_user = await User.get(pid)
            if p_user:
                participants.append(p_user)
        results.append({
            "id": str(conv.id),
            "participants": participants,
            "lastMessageId": str(conv.lastMessageId) if conv.lastMessageId else None,
            "createdAt": conv.createdAt,
            "updatedAt": conv.updatedAt
        })
    return results

@router.get("/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    conv_id = ObjectId(conversation_id)
    conv = await DirectConversation.get(conv_id)
    if not conv or current_user.id not in conv.participants:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    messages = await DirectMessage.find({"conversationId": conv_id}).sort("createdAt").to_list()
    
    results = []
    for m in messages:
        sender = await User.get(m.senderId)
        if sender:
            results.append({
                "id": str(m.id),
                "conversationId": str(m.conversationId),
                "sender": sender,
                "content": m.content,
                "isEdited": m.isEdited,
                "editedAt": m.editedAt,
                "deleted": m.deleted,
                "deletedAt": m.deletedAt,
                "attachments": m.attachments,
                "createdAt": m.createdAt,
                "updatedAt": m.updatedAt
            })
    return results

@router.post("/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    msg_in: DirectMessageCreate,
    current_user: User = Depends(get_current_user)
):
    conv_id = ObjectId(conversation_id)
    conv = await DirectConversation.get(conv_id)
    if not conv or current_user.id not in conv.participants:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    new_msg = DirectMessage(
        conversationId=conv_id,
        senderId=current_user.id,
        content=msg_in.content,
        attachments=msg_in.attachments
    )
    await new_msg.insert()
    
    conv.lastMessageId = new_msg.id
    conv.updatedAt = datetime.utcnow()
    await conv.save()
    
    sender = await User.get(current_user.id)
    msg_dict = {
        "id": str(new_msg.id),
        "conversationId": str(new_msg.conversationId),
        "sender": sender.model_dump() if sender else None,
        "content": new_msg.content,
        "isEdited": new_msg.isEdited,
        "editedAt": str(new_msg.editedAt) if new_msg.editedAt else None,
        "deleted": new_msg.deleted,
        "deletedAt": str(new_msg.deletedAt) if new_msg.deletedAt else None,
        "attachments": [a.model_dump() for a in new_msg.attachments],
        "createdAt": str(new_msg.createdAt),
        "updatedAt": str(new_msg.updatedAt)
    }
    
    # Broadcast to conversation participants
    for pid in conv.participants:
        from app.sockets.events import user_to_sid
        sid = user_to_sid.get(str(pid))
        if sid:
            await sio.emit("new_direct_message", msg_dict, to=sid)
            
    return msg_dict

@router.patch("/messages/{message_id}")
async def edit_message(
    message_id: str,
    req: MessageEditRequest,
    current_user: User = Depends(get_current_user)
):
    msg = await DirectMessage.get(ObjectId(message_id))
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    if msg.senderId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    msg.content = req.content
    msg.isEdited = True
    msg.editedAt = datetime.utcnow()
    msg.updatedAt = datetime.utcnow()
    await msg.save()
    
    conv = await DirectConversation.get(msg.conversationId)
    
    # Needs to broadcast update_direct_message
    if conv:
        for pid in conv.participants:
            from app.sockets.events import user_to_sid
            sid = user_to_sid.get(str(pid))
            if sid:
                await sio.emit("update_direct_message", {"id": str(msg.id), "content": msg.content, "isEdited": True, "conversationId": str(msg.conversationId)}, to=sid)
                
    return {"message": "Message edited"}

@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    current_user: User = Depends(get_current_user)
):
    msg = await DirectMessage.get(ObjectId(message_id))
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    if msg.senderId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    msg.deleted = True
    msg.deletedAt = datetime.utcnow()
    msg.content = "This message has been deleted."
    msg.updatedAt = datetime.utcnow()
    await msg.save()
    
    conv = await DirectConversation.get(msg.conversationId)
    if conv:
        for pid in conv.participants:
            from app.sockets.events import user_to_sid
            sid = user_to_sid.get(str(pid))
            if sid:
                await sio.emit("delete_direct_message", {"id": str(msg.id), "conversationId": str(msg.conversationId)}, to=sid)
                
    return {"message": "Message deleted"}
