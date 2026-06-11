from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List
from beanie import PydanticObjectId as ObjectId
from app.models.user import User
from app.models.friendship import Friendship
from app.models.server import Server
from app.schemas.user import UserResponse
from app.api.deps import get_current_user
import re

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
    # Regex search for username
    regex = re.compile(f".*{q}.*", re.IGNORECASE)
    users = await User.find({"username": regex, "_id": {"$ne": current_user.id}}).to_list()
    return [UserResponse.model_validate(u) for u in users]
