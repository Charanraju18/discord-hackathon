from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from beanie import PydanticObjectId as ObjectId
from beanie.operators import Set
from app.models.user import User
from app.models.friendship import Friendship
from app.models.server import Server
from app.schemas.user import UserResponse
from app.api.deps import get_current_user
import re

class UserUpdateRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None

router = APIRouter()

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "isOnline": current_user.isOnline,
        "createdAt": str(current_user.createdAt)
    }

@router.patch("/me")
async def update_me(
    req: UserUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    updates = {}
    if req.username and req.username != current_user.username:
        existing = await User.find_one({"username": req.username, "_id": {"$ne": current_user.id}})
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        updates[User.username] = req.username
    if req.email and req.email != current_user.email:
        existing = await User.find_one({"email": req.email, "_id": {"$ne": current_user.id}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        updates[User.email] = req.email
    if updates:
        await current_user.update(Set(updates))
        await current_user.sync()
    return {
        "id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "isOnline": current_user.isOnline,
        "createdAt": str(current_user.createdAt)
    }

@router.get("/{user_id}/profile")
async def get_user_profile(
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    target = await User.get(ObjectId(user_id))
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    # Mutual servers — servers both users are in
    my_servers = await Server.find({"members": current_user.id}).to_list()
    target_server_ids = set()
    for s in await Server.find({"members": target.id}).to_list():
        target_server_ids.add(str(s.id))
    mutual_servers = [s for s in my_servers if str(s.id) in target_server_ids]

    # Mutual friends — friends of current_user who are also friends with target
    my_friendships = await Friendship.find({
        "$or": [{"userOneId": current_user.id}, {"userTwoId": current_user.id}]
    }).to_list()
    my_friend_ids = {
        str(f.userTwoId if f.userOneId == current_user.id else f.userOneId)
        for f in my_friendships
    }
    target_friendships = await Friendship.find({
        "$or": [{"userOneId": target.id}, {"userTwoId": target.id}]
    }).to_list()
    target_friend_ids = {
        str(f.userTwoId if f.userOneId == target.id else f.userOneId)
        for f in target_friendships
    }
    mutual_friend_ids = my_friend_ids & target_friend_ids

    # Build mutual friends user objects
    mutual_friend_users = []
    for fid in mutual_friend_ids:
        u = await User.get(ObjectId(fid))
        if u:
            mutual_friend_users.append({"id": str(u.id), "username": u.username, "isOnline": u.isOnline})

    return {
        "id": str(target.id),
        "username": target.username,
        "email": target.email,
        "isOnline": target.isOnline,
        "lastSeen": str(target.lastSeen) if target.lastSeen else None,
        "createdAt": str(target.createdAt),
        "mutualServers": len(mutual_servers),
        "mutualFriends": len(mutual_friend_ids),
        "mutualServersList": [{"id": str(s.id), "name": s.name, "icon": s.icon} for s in mutual_servers],
        "mutualFriendsList": mutual_friend_users
    }

@router.get("/search", response_model=List[UserResponse])
async def search_users(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user)
):
    from app.models.friendship import Friendship
    from app.models.friend_request import FriendRequest

    my_friendships = await Friendship.find({
        "$or": [{"userOneId": current_user.id}, {"userTwoId": current_user.id}]
    }).to_list()
    friend_ids = {
        f.userTwoId if f.userOneId == current_user.id else f.userOneId
        for f in my_friendships
    }

    pending_reqs = await FriendRequest.find({
        "$or": [{"senderId": current_user.id}, {"receiverId": current_user.id}]
    }).to_list()
    pending_ids = {
        r.receiverId if r.senderId == current_user.id else r.senderId
        for r in pending_reqs
    }

    exclude_ids = [current_user.id] + list(friend_ids | pending_ids)
    regex = re.compile(f".*{q}.*", re.IGNORECASE)
    users = await User.find({"username": regex, "_id": {"$nin": exclude_ids}}).to_list()
    return [UserResponse.model_validate(u) for u in users]
