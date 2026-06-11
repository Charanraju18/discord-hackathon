from pydantic import BaseModel
from typing import List
from datetime import datetime
from beanie import PydanticObjectId as ObjectId
from app.schemas.user import UserResponse

class FriendRequestCreate(BaseModel):
    receiver_id: str

class FriendRequestResponse(BaseModel):
    id: ObjectId
    sender: UserResponse
    receiver: UserResponse
    createdAt: datetime

class FriendshipResponse(BaseModel):
    id: ObjectId
    friend: UserResponse
    createdAt: datetime

class FriendsListResponse(BaseModel):
    friends: List[FriendshipResponse]
    pending_requests: List[FriendRequestResponse]
