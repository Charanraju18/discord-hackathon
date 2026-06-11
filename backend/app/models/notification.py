from typing import Any, Dict
from datetime import datetime
from pydantic import Field
from beanie import Document
from beanie import PydanticObjectId as ObjectId
import pymongo

class Notification(Document):
    userId: ObjectId
    type: str
    data: Dict[str, Any]
    read: bool = False
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "notifications"
        indexes = [
            pymongo.IndexModel([("userId", pymongo.ASCENDING), ("createdAt", pymongo.DESCENDING)])
        ]
