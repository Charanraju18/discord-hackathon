from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from beanie import PydanticObjectId as ObjectId
from app.schemas.user import UserResponse

class ChannelCreate(BaseModel):
    name: str
    type: str = "text"

class ChannelResponse(BaseModel):
    id: ObjectId
    serverId: ObjectId
    name: str
    type: str
    createdAt: datetime
    updatedAt: datetime

class ServerCreate(BaseModel):
    name: str
    icon: Optional[str] = None

class ServerMember(BaseModel):
    userId: UserResponse
    role: str
    joinedAt: datetime

class ServerResponse(BaseModel):
    id: ObjectId
    name: str
    icon: Optional[str] = None
    ownerId: ObjectId
    members: List[ServerMember]
    channels: List[ChannelResponse]
    createdAt: datetime
    updatedAt: datetime

class InviteCreate(BaseModel):
    serverId: str

class InviteResponse(BaseModel):
    id: ObjectId
    code: str
    serverId: ObjectId
    createdBy: ObjectId
    expiresAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime
