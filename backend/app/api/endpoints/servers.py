from fastapi import APIRouter, Depends, HTTPException
from typing import List
from beanie import PydanticObjectId as ObjectId
from datetime import datetime

from app.models.user import User
from app.models.server import Server
from app.models.channel import Channel
from app.models.invite import Invite
from app.models.server_invitation import ServerInvitation
from app.schemas.server import ServerCreate, ServerResponse, ChannelCreate, ChannelResponse, InviteResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/")
async def get_servers(current_user: User = Depends(get_current_user)):
    servers = await Server.find({"members": current_user.id}).to_list()
    results = []
    for s in servers:
        s_dict = s.model_dump()
        s_dict['id'] = str(s.id)
        
        # Populate members manually for response if needed
        populated_members = []
        for m_id in s.members:
            u = await User.get(m_id)
            if u:
                populated_members.append({
                    "userId": u.model_dump(),
                    "role": "member", # Simplified as role is not stored in members array
                    "joinedAt": str(datetime.utcnow()) # Defaulting since joinedAt is not stored
                })
        s_dict['members'] = populated_members
        
        # Get channels
        channels = await Channel.find({"serverId": s.id}).to_list()
        s_dict['channels'] = [
            {
                "id": str(c.id),
                "serverId": str(c.serverId),
                "name": c.name,
                "type": c.type,
                "createdAt": str(c.createdAt),
                "updatedAt": str(c.updatedAt)
            } for c in channels
        ]
        results.append(s_dict)
    return results

@router.post("/")
async def create_server(
    req: ServerCreate,
    current_user: User = Depends(get_current_user)
):
    new_server = Server(
        name=req.name,
        icon=req.icon,
        ownerId=current_user.id,
        members=[current_user.id]
    )
    await new_server.insert()
    
    # Default channel
    default_channel = Channel(
        serverId=new_server.id,
        name="general",
        type="text"
    )
    await default_channel.insert()
    
    # Build response
    s_dict = new_server.model_dump()
    s_dict['id'] = str(new_server.id)
    s_dict['members'] = [{
        "userId": current_user.model_dump(),
        "role": "owner",
        "joinedAt": str(datetime.utcnow())
    }]
    s_dict['channels'] = [{
        "id": str(default_channel.id),
        "serverId": str(default_channel.serverId),
        "name": default_channel.name,
        "type": default_channel.type,
        "createdAt": str(default_channel.createdAt),
        "updatedAt": str(default_channel.updatedAt)
    }]
    return s_dict

@router.post("/{server_id}/join")
async def join_server(
    server_id: str,
    current_user: User = Depends(get_current_user)
):
    s_id = ObjectId(server_id)
    server = await Server.get(s_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
        
    if current_user.id in server.members:
        raise HTTPException(status_code=400, detail="Already a member")
            
    server.members.append(current_user.id)
    await server.save()
    return {"message": "Successfully joined server"}

@router.get("/{server_id}/members")
async def get_server_members(
    server_id: str,
    current_user: User = Depends(get_current_user)
):
    s_id = ObjectId(server_id)
    server = await Server.get(s_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
        
    populated_members = []
    for m_id in server.members:
        u = await User.get(m_id)
        if u:
            populated_members.append({
                "userId": u.model_dump(),
                "role": "member",
                "joinedAt": str(datetime.utcnow())
            })
    return populated_members

import string
import random

@router.post("/{server_id}/invites")
async def create_invite(
    server_id: str,
    current_user: User = Depends(get_current_user)
):
    s_id = ObjectId(server_id)
    server = await Server.get(s_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
        
    code = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    new_invite = Invite(
        code=code,
        serverId=s_id,
        createdBy=current_user.id
    )
    await new_invite.insert()
    return {
        "id": str(new_invite.id),
        "code": new_invite.code,
        "serverId": str(new_invite.serverId),
        "createdBy": str(new_invite.createdBy)
    }

from pydantic import BaseModel
class InviteUserRequest(BaseModel):
    userId: str

@router.post("/{server_id}/invite-user")
async def invite_user(
    server_id: str,
    req: InviteUserRequest,
    current_user: User = Depends(get_current_user)
):
    s_id = ObjectId(server_id)
    server = await Server.get(s_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
        
    receiver_id = ObjectId(req.userId)
    new_invitation = ServerInvitation(
        serverId=s_id,
        senderId=current_user.id,
        receiverId=receiver_id
    )
    await new_invitation.insert()
    return {"message": "User invited"}
