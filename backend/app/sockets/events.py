import asyncio
from app.sockets import sio
from app.models.user import User
from beanie import PydanticObjectId as ObjectId
from datetime import datetime

# Map sid to user_id and vice versa
sid_to_user = {}
user_to_sid = {}

# Voice Rooms State
# format: { channel_id: { "participants": { user_id: { "muted": False, "deafened": False, "video": False, "screenSharing": False, "sid": "socket_id" } } } }
voice_rooms = {}

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
            await sio.emit("presence", {"userId": user_id, "isOnline": True})
    except Exception as e:
        print(f"Setup error: {e}")

    # Join server-level rooms so user receives channel-unread notifications
    # for all servers they're a member of (not just the currently active channel)
    try:
        from app.models.server import Server as ServerModel
        user_servers = await ServerModel.find({"members": ObjectId(user_id)}).to_list()
        for srv in user_servers:
            await sio.enter_room(sid, f"server:{str(srv.id)}")
    except Exception as e:
        print(f"Setup server rooms error: {e}")

@sio.on("disconnect")
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    user_id = sid_to_user.get(sid)
    if user_id:
        del sid_to_user[sid]
        if user_id in user_to_sid:
            del user_to_sid[user_id]
            
        # Cleanup voice rooms
        empty_rooms = []
        for channel_id, room_data in voice_rooms.items():
            if user_id in room_data["participants"]:
                del room_data["participants"][user_id]
                await sio.leave_room(sid, f"voice_{channel_id}")
                asyncio.create_task(sio.emit("user_left_voice", {"userId": user_id, "channelId": channel_id}, room=f"voice_{channel_id}"))
                if not room_data["participants"]:
                    empty_rooms.append(channel_id)
        
        for room in empty_rooms:
            del voice_rooms[room]
            
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
    await sio.enter_room(sid, str(channel_id))
    print(f"Client {sid} joined channel {channel_id}")

@sio.on("leave-channel")
async def leave_channel(sid, channel_id):
    if not channel_id:
        return
    await sio.leave_room(sid, str(channel_id))
    print(f"Client {sid} left channel {channel_id}")

from app.models.server import Server

@sio.on("join_voice_channel")
async def join_voice_channel(sid, channel_id):
    if not channel_id:
        return
        
    user_id = sid_to_user.get(sid)
    if not user_id:
        return
        
    try:
        channel = await Channel.get(ObjectId(channel_id))
        if not channel:
            return
            
        server = await Server.get(channel.serverId)
        if not server or ObjectId(user_id) not in server.members:
            # For owner: checking if ownerId == user_id
            if server and server.ownerId != ObjectId(user_id):
                print(f"User {user_id} not allowed to join voice channel {channel_id}")
                return

        user = await User.get(ObjectId(user_id))
        username = user.username if user else "User"

        # Initialize room if not exists
        if channel_id not in voice_rooms:
            voice_rooms[channel_id] = {"participants": {}}
            
        # Check if user is already in another voice channel, remove them first
        for c_id, room_data in voice_rooms.items():
            if user_id in room_data["participants"]:
                del room_data["participants"][user_id]
                await sio.leave_room(sid, f"voice_{c_id}")
                await sio.emit("user_left_voice", {"userId": user_id, "channelId": c_id}, room=f"voice_{c_id}")
                
        # Add user to room
        voice_rooms[channel_id]["participants"][user_id] = {
            "muted": False,
            "deafened": False,
            "video": False,
            "screenSharing": False,
            "sid": sid,
            "username": username
        }
        
        # Enter Socket.IO room specifically for voice (different from text channel room)
        voice_room_id = f"voice_{channel_id}"
        await sio.enter_room(sid, voice_room_id)
        
        print(f"User {user_id} joined voice channel {channel_id}")
        
        # Broadcast user joined to others in the room
        await sio.emit("user_joined_voice", {
            "userId": user_id, 
            "channelId": channel_id,
            "state": voice_rooms[channel_id]["participants"][user_id]
        }, room=voice_room_id, skip_sid=sid)
        
        # Send full room state to the joining user
        await sio.emit("voice_room_state", {
            "channelId": channel_id,
            "participants": voice_rooms[channel_id]["participants"]
        }, to=sid)
        
    except Exception as e:
        print(f"Error joining voice channel: {e}")

@sio.on("leave_voice_channel")
async def handle_leave_voice_channel(sid, channel_id):
    if not channel_id:
        return
        
    user_id = sid_to_user.get(sid)
    if not user_id:
        return
        
    if channel_id in voice_rooms and user_id in voice_rooms[channel_id]["participants"]:
        del voice_rooms[channel_id]["participants"][user_id]
        voice_room_id = f"voice_{channel_id}"
        await sio.leave_room(sid, voice_room_id)
        
        await sio.emit("user_left_voice", {
            "userId": user_id,
            "channelId": channel_id
        }, room=voice_room_id)
        
        # Clean up empty rooms
        if not voice_rooms[channel_id]["participants"]:
            del voice_rooms[channel_id]
            
    print(f"User {user_id} left voice channel {channel_id}")

# WebRTC Signaling Events
@sio.on("offer")
async def handle_offer(sid, data):
    target_user_id = data.get("targetUserId")
    if not target_user_id or target_user_id not in user_to_sid:
        return
    
    target_sid = user_to_sid[target_user_id]
    sender_id = sid_to_user.get(sid)
    
    await sio.emit("offer", {
        "senderId": sender_id,
        "offer": data.get("offer")
    }, to=target_sid)

@sio.on("answer")
async def handle_answer(sid, data):
    target_user_id = data.get("targetUserId")
    if not target_user_id or target_user_id not in user_to_sid:
        return
    
    target_sid = user_to_sid[target_user_id]
    sender_id = sid_to_user.get(sid)
    
    await sio.emit("answer", {
        "senderId": sender_id,
        "answer": data.get("answer")
    }, to=target_sid)

@sio.on("ice_candidate")
async def handle_ice_candidate(sid, data):
    target_user_id = data.get("targetUserId")
    if not target_user_id or target_user_id not in user_to_sid:
        return
        
    target_sid = user_to_sid[target_user_id]
    sender_id = sid_to_user.get(sid)
    
    await sio.emit("ice_candidate", {
        "senderId": sender_id,
        "candidate": data.get("candidate")
    }, to=target_sid)

# State Update Events
@sio.on("update_voice_state")
async def handle_update_voice_state(sid, data):
    user_id = sid_to_user.get(sid)
    channel_id = data.get("channelId")
    updates = data.get("updates", {})
    
    if not user_id or not channel_id:
        return
        
    if channel_id in voice_rooms and user_id in voice_rooms[channel_id]["participants"]:
        room_participant = voice_rooms[channel_id]["participants"][user_id]
        
        # Apply updates
        if "muted" in updates: room_participant["muted"] = updates["muted"]
        if "deafened" in updates: room_participant["deafened"] = updates["deafened"]
        if "video" in updates: room_participant["video"] = updates["video"]
        if "screenSharing" in updates: room_participant["screenSharing"] = updates["screenSharing"]
        
        await sio.emit("voice_state_updated", {
            "userId": user_id,
            "channelId": channel_id,
            "state": room_participant
        }, room=f"voice_{channel_id}")


from app.models.message import Message
from app.models.channel import Channel

@sio.on("new-message")
async def handle_new_message(sid, data):
    channel_id = data.get("channelId")
    server_id = data.get("serverId")  # passed by frontend, not stored on Message model
    content = data.get("content", "")
    attachments = data.get("attachments", [])

    user_id = sid_to_user.get(sid)
    if not user_id:
        return

    try:
        new_msg = Message(
            channelId=ObjectId(channel_id),
            senderId=ObjectId(user_id),
            content=content,
            attachments=attachments
        )
        await new_msg.insert()

        sender = await User.get(ObjectId(user_id))

        payload = {
            "id": str(new_msg.id),
            "channelId": str(new_msg.channelId),
            "serverId": server_id,  # pass through for client-side unread tracking
            "sender": {"id": str(sender.id), "username": sender.username, "email": sender.email, "isOnline": sender.isOnline} if sender else None,
            "content": new_msg.content,
            "isEdited": new_msg.isEdited,
            "editedAt": str(new_msg.editedAt) if new_msg.editedAt else None,
            "deleted": new_msg.deleted,
            "deletedAt": str(new_msg.deletedAt) if new_msg.deletedAt else None,
            "attachments": [{"url": a.url, "publicId": a.publicId, "fileName": a.fileName, "fileSize": a.fileSize, "mimeType": a.mimeType, "resourceType": a.resourceType, "uploadedAt": str(a.uploadedAt) if a.uploadedAt else None} for a in new_msg.attachments],
            "reactions": [{"emoji": r.emoji, "users": r.users} for r in getattr(new_msg, 'reactions', [])],
            "createdAt": str(new_msg.createdAt),
            "updatedAt": str(new_msg.updatedAt)
        }

        await sio.emit("new-message", payload, room=str(channel_id))

        # Emit unread notification to the server-level room so users on
        # other channels (but same server) can update their unread badges.
        if server_id:
            await sio.emit("channel-unread", {
                "channelId": str(channel_id),
                "serverId": server_id,
                "senderId": user_id,
            }, room=f"server:{server_id}")

    except Exception as e:
        print(f"Error handling new message: {e}")

from app.models.direct_message import DirectMessage
from app.models.direct_conversation import DirectConversation
from app.models.message import Reaction

@sio.on("add_reaction")
async def handle_add_reaction(sid, data):
    user_id = sid_to_user.get(sid)
    if not user_id: return
    
    msg_id = data.get("messageId")
    emoji = data.get("emoji")
    msg_type = data.get("type", "channel")
    
    if not msg_id or not emoji: return
    
    try:
        if msg_type == "channel":
            msg = await Message.get(ObjectId(msg_id))
        else:
            msg = await DirectMessage.get(ObjectId(msg_id))
            
        if not msg: return
        
        reaction = next((r for r in msg.reactions if r.emoji == emoji), None)
        if reaction:
            if user_id not in reaction.users:
                reaction.users.append(user_id)
        else:
            msg.reactions.append(Reaction(emoji=emoji, users=[user_id]))
            
        await msg.save()
        
        from app.api.endpoints.messages import _resolve_reactions
        resolved_reactions = await _resolve_reactions(msg.reactions)
        
        payload = {
            "messageId": str(msg.id),
            "channelId": str(msg.channelId) if msg_type == "channel" else str(msg.conversationId),
            "reactions": resolved_reactions,
            "type": msg_type
        }
        
        if msg_type == "channel":
            await sio.emit("reaction_updated", payload, room=str(msg.channelId))
        else:
            conv = await DirectConversation.get(msg.conversationId)
            if conv:
                for pid in conv.participants:
                    target_sid = user_to_sid.get(str(pid))
                    if target_sid:
                        await sio.emit("reaction_updated", payload, to=target_sid)
    except Exception as e:
        print(f"Error adding reaction: {e}")

@sio.on("remove_reaction")
async def handle_remove_reaction(sid, data):
    user_id = sid_to_user.get(sid)
    if not user_id: return
    
    msg_id = data.get("messageId")
    emoji = data.get("emoji")
    msg_type = data.get("type", "channel")
    
    if not msg_id or not emoji: return
    
    try:
        if msg_type == "channel":
            msg = await Message.get(ObjectId(msg_id))
        else:
            msg = await DirectMessage.get(ObjectId(msg_id))
            
        if not msg: return
        
        reaction = next((r for r in msg.reactions if r.emoji == emoji), None)
        if reaction and user_id in reaction.users:
            reaction.users.remove(user_id)
            if not reaction.users:
                msg.reactions.remove(reaction)
            await msg.save()
            
            from app.api.endpoints.messages import _resolve_reactions
            resolved_reactions = await _resolve_reactions(msg.reactions)
            
            payload = {
                "messageId": str(msg.id),
                "channelId": str(msg.channelId) if msg_type == "channel" else str(msg.conversationId),
                "reactions": resolved_reactions,
                "type": msg_type
            }
            
            if msg_type == "channel":
                await sio.emit("reaction_updated", payload, room=str(msg.channelId))
            else:
                conv = await DirectConversation.get(msg.conversationId)
                if conv:
                    for pid in conv.participants:
                        target_sid = user_to_sid.get(str(pid))
                        if target_sid:
                            await sio.emit("reaction_updated", payload, to=target_sid)
    except Exception as e:
        print(f"Error removing reaction: {e}")
