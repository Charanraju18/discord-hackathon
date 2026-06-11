from typing import Optional, List, Dict
from datetime import datetime
from pydantic import Field, BaseModel
from beanie import Document
from beanie import PydanticObjectId as ObjectId
from pymongo import IndexModel, ASCENDING

class User(Document):
    username: str
    email: str
    password: Optional[str] = None
    isOnline: bool = False
    lastSeen: Optional[datetime] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("username", ASCENDING)], unique=True),
            IndexModel([("email", ASCENDING)], unique=True),
        ]
