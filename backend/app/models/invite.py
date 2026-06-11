from typing import Optional
from datetime import datetime
from pydantic import Field
from beanie import Document
from beanie import PydanticObjectId as ObjectId
from pymongo import IndexModel, ASCENDING

class Invite(Document):
    code: str
    serverId: ObjectId
    createdBy: ObjectId
    expiresAt: Optional[datetime] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "invites"
        indexes = [
            IndexModel([("code", ASCENDING)], unique=True),
            IndexModel([("serverId", ASCENDING)]),
        ]
