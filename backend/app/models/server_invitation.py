from typing import Optional
from datetime import datetime
from pydantic import Field
from beanie import Document
from beanie import PydanticObjectId as ObjectId
from pymongo import IndexModel, ASCENDING

class ServerInvitation(Document):
    serverId: ObjectId
    senderId: ObjectId
    receiverId: ObjectId
    status: str = "pending" # 'pending', 'accepted', 'declined'
    expiresAt: Optional[datetime] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "serverinvitations"
        indexes = [
            IndexModel([("serverId", ASCENDING)]),
            IndexModel([("receiverId", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
        ]
