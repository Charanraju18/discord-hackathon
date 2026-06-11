from app.sockets import sio
from app.models.user import User
from beanie import PydanticObjectId as ObjectId
from datetime import datetime

# Map sid to user_id and vice versa
sid_to_user = {}
user_to_sid = {}

@sio.on("connect")
async def connect(sid, environ, auth):
    print(f"Client connected: {sid}")
    # In a real app, validate JWT from auth dict

@sio.on("setup")
async def setup(sid, user_id):
    if not user_id:
        return
    print(f"User setup: {user_id} with sid {sid}")
    
    # Store mapping
    sid_to_user[sid] = user_id
    user_to_sid[user_id] = sid
    
    # Update online status
    try:
        user = await User.get(ObjectId(user_id))
        if user:
            user.isOnline = True
            await user.save()
            # Broadcast to friends or globally that user is online
            await sio.emit("presence", {"userId": user_id, "isOnline": True})
    except Exception as e:
        print(f"Setup error: {e}")

@sio.on("disconnect")
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    user_id = sid_to_user.get(sid)
    if user_id:
        del sid_to_user[sid]
        if user_id in user_to_sid:
            del user_to_sid[user_id]
            
        try:
            user = await User.get(ObjectId(user_id))
            if user:
                user.isOnline = False
                user.lastSeen = datetime.utcnow()
                await user.save()
                await sio.emit("presence", {"userId": user_id, "isOnline": False})
        except Exception as e:
            print(f"Disconnect error: {e}")

@sio.on("join-channel")
async def join_channel(sid, channel_id):
    if not channel_id:
        return
    sio.enter_room(sid, str(channel_id))
    print(f"Client {sid} joined channel {channel_id}")

@sio.on("leave-channel")
async def leave_channel(sid, channel_id):
    if not channel_id:
        return
    sio.leave_room(sid, str(channel_id))
    print(f"Client {sid} left channel {channel_id}")

from app.models.message import Message
from app.models.channel import Channel

@sio.on("new-message")
async def handle_new_message(sid, data):
    # data: { channelId, serverId, content, attachments, sender: { _id, username, ... } }
    channel_id = data.get("channelId")
    content = data.get("content", "")
    attachments = data.get("attachments", [])
    
    user_id = sid_to_user.get(sid)
    if not user_id:
        return
        
    try:
        new_msg = Message(
            channelId=ObjectId(channel_id),
            serverId=ObjectId(data.get("serverId")),
            senderId=ObjectId(user_id),
            content=content,
            attachments=attachments
        )
        await new_msg.insert()
        
        sender = await User.get(ObjectId(user_id))
        
        payload = {
            "id": str(new_msg.id),
            "channelId": str(new_msg.channelId),
            "serverId": str(new_msg.serverId),
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
        
        await sio.emit("new-message", payload, room=str(channel_id))
    except Exception as e:
        print(f"Error handling new message: {e}")
