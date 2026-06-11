from datetime import datetime
from pydantic import Field
from beanie import Document
from beanie import PydanticObjectId as ObjectId
import pymongo

class FriendRequest(Document):
    senderId: ObjectId
    receiverId: ObjectId
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "friendrequests"
        indexes = [
            pymongo.IndexModel([("senderId", pymongo.ASCENDING), ("receiverId", pymongo.ASCENDING)], unique=True)
        ]
