from typing import List, Optional
from datetime import datetime
from pydantic import Field
from beanie import Document
from beanie import PydanticObjectId as ObjectId

class Server(Document):
    name: str
    icon: Optional[str] = None
    ownerId: ObjectId
    members: List[ObjectId] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "servers"
