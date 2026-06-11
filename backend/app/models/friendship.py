from datetime import datetime
from pydantic import Field
from beanie import Document
from beanie import PydanticObjectId as ObjectId
import pymongo

class Friendship(Document):
    userOneId: ObjectId
    userTwoId: ObjectId
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "friendships"
        indexes = [
            pymongo.IndexModel([("userOneId", pymongo.ASCENDING), ("userTwoId", pymongo.ASCENDING)], unique=True)
        ]
