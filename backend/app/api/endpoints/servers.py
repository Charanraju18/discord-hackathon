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

def _user_dict(u: User) -> dict:
    return {"id": str(u.id), "username": u.username, "email": u.email, "isOnline": u.isOnline}

def _channel_dict(c: Channel) -> dict:
    return {"id": str(c.id), "serverId": str(c.serverId), "name": c.name, "type": c.type,
            "createdAt": str(c.createdAt), "updatedAt": str(c.updatedAt)}

def _server_dict(s: Server, members: list, channels: list) -> dict:
    return {
        "id": str(s.id),
        "name": s.name,
        "icon": s.icon,
        "ownerId": str(s.ownerId),
        "members": members,
        "channels": channels,
        "createdAt": str(s.createdAt),
        "updatedAt": str(s.updatedAt)
    }

@router.get("")
async def get_servers(current_user: User = Depends(get_current_user)):
    servers = await Server.find({"members": current_user.id}).to_list()
    results = []
    for s in servers:
        members = []
        for m_id in s.members:
            u = await User.get(m_id)
            if u:
                members.append({"userId": _user_dict(u), "role": "member", "joinedAt": str(datetime.utcnow())})
        channels = await Channel.find({"serverId": s.id}).to_list()
        results.append(_server_dict(s, members, [_channel_dict(c) for c in channels]))
    return results

@router.post("")
async def create_server(req: ServerCreate, current_user: User = Depends(get_current_user)):
    new_server = Server(name=req.name, icon=req.icon, ownerId=current_user.id, members=[current_user.id])
    await new_server.insert()

    default_channel = Channel(serverId=new_server.id, name="general", type="text")
    await default_channel.insert()

    members = [{"userId": _user_dict(current_user), "role": "owner", "joinedAt": str(datetime.utcnow())}]
    return _server_dict(new_server, members, [_channel_dict(default_channel)])

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
                "id": str(u.id),
                "username": u.username,
                "email": u.email,
                "isOnline": u.isOnline,
                "role": "owner" if u.id == server.ownerId else "member"
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
