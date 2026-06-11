from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from beanie import PydanticObjectId as ObjectId
from app.models.user import User
from app.models.friendship import Friendship
from app.models.friend_request import FriendRequest
from app.schemas.friend import FriendRequestCreate, FriendRequestResponse, FriendshipResponse, FriendsListResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/request")
async def send_request(
    req: FriendRequestCreate,
    current_user: User = Depends(get_current_user)
):
    receiver_id = ObjectId(req.receiver_id)
    if current_user.id == receiver_id:
        raise HTTPException(status_code=400, detail="Cannot send request to yourself")
    
    receiver = await User.get(receiver_id)
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Check if already friends
    existing_friendship = await Friendship.find_one({
        "$or": [
            {"userOneId": current_user.id, "userTwoId": receiver_id},
            {"userOneId": receiver_id, "userTwoId": current_user.id}
        ]
    })
    if existing_friendship:
        raise HTTPException(status_code=400, detail="Already friends")
        
    # Check if request already sent or received
    existing_req = await FriendRequest.find_one({
        "$or": [
            {"senderId": current_user.id, "receiverId": receiver_id},
            {"senderId": receiver_id, "receiverId": current_user.id}
        ]
    })
    if existing_req:
        raise HTTPException(status_code=400, detail="Friend request already exists")
        
    new_req = FriendRequest(senderId=current_user.id, receiverId=receiver_id)
    await new_req.insert()
    return {"message": "Friend request sent"}

@router.get("/requests")
async def get_requests(current_user: User = Depends(get_current_user)):
    # Get requests where user is sender or receiver
    requests = await FriendRequest.find({
        "$or": [
            {"senderId": current_user.id},
            {"receiverId": current_user.id}
        ]
    }).to_list()
    
    # Manually populate sender and receiver
    populated_requests = []
    for r in requests:
        sender = await User.get(r.senderId)
        receiver = await User.get(r.receiverId)
        if sender and receiver:
            populated_requests.append({
                "id": str(r.id),
                "sender": sender,
                "receiver": receiver,
                "createdAt": r.createdAt
            })
    return populated_requests

@router.post("/request/{request_id}/accept")
async def accept_request(
    request_id: str,
    current_user: User = Depends(get_current_user)
):
    req = await FriendRequest.get(ObjectId(request_id))
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if req.receiverId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Create friendship
    friendship = Friendship(userOneId=req.senderId, userTwoId=req.receiverId)
    await friendship.insert()
    
    # Delete request
    await req.delete()
    return {"message": "Friend request accepted"}

@router.post("/request/{request_id}/reject")
async def reject_request(
    request_id: str,
    current_user: User = Depends(get_current_user)
):
    req = await FriendRequest.get(ObjectId(request_id))
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
        
    if req.receiverId != current_user.id and req.senderId != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    await req.delete()
    return {"message": "Friend request rejected"}

@router.get("/")
async def get_friends(current_user: User = Depends(get_current_user)):
    friendships = await Friendship.find({
        "$or": [
            {"userOneId": current_user.id},
            {"userTwoId": current_user.id}
        ]
    }).to_list()
    
    populated_friends = []
    for f in friendships:
        friend_id = f.userTwoId if f.userOneId == current_user.id else f.userOneId
        friend = await User.get(friend_id)
        if friend:
            populated_friends.append({
                "id": str(f.id),
                "friend": friend,
                "createdAt": f.createdAt
            })
    return populated_friends

@router.delete("/{friend_id}")
async def remove_friend(
    friend_id: str,
    current_user: User = Depends(get_current_user)
):
    f_id = ObjectId(friend_id)
    friendship = await Friendship.find_one({
        "$or": [
            {"userOneId": current_user.id, "userTwoId": f_id},
            {"userOneId": f_id, "userTwoId": current_user.id}
        ]
    })
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")
        
    await friendship.delete()
    return {"message": "Friend removed"}
