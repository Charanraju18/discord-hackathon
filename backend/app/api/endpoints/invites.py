from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId as ObjectId
from datetime import datetime

from app.models.user import User
from app.models.server import Server
from app.models.invite import Invite
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/{code}")
async def get_invite(code: str):
    invite = await Invite.find_one({"code": code})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or expired")
        
    server = await Server.get(invite.serverId)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
        
    from app.models.user import User as UserModel
    online_count = 0
    for m_id in server.members:
        u = await UserModel.get(m_id)
        if u and u.isOnline:
            online_count += 1

    return {
        "invite": {
            "code": invite.code,
            "serverId": str(invite.serverId)
        },
        "server": {
            "name": server.name,
            "icon": server.icon,
            "memberCount": len(server.members),
            "onlineCount": online_count,
            "createdAt": str(server.createdAt)
        }
    }

@router.post("/{code}/join")
async def join_invite(
    code: str,
    current_user: User = Depends(get_current_user)
):
    invite = await Invite.find_one({"code": code})
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found or expired")
        
    server = await Server.get(invite.serverId)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
        
    if current_user.id in server.members:
        return {"message": "Already a member", "serverId": str(server.id)}

    server.members.append(current_user.id)
    await server.save()

    # Notify the joining user in real-time so the sidebar updates instantly
    from app.sockets import sio
    from app.sockets.events import user_to_sid
    user_sid = user_to_sid.get(str(current_user.id))
    if user_sid:
        await sio.emit("server_joined", {
            "serverId": str(server.id),
            "server": {
                "id": str(server.id),
                "name": server.name,
                "icon": server.icon,
                "memberCount": len(server.members),
            }
        }, to=user_sid)
        # Also join the server notification room
        await sio.enter_room(user_sid, f"server:{str(server.id)}")

    return {"message": "Successfully joined server", "serverId": str(server.id)}
