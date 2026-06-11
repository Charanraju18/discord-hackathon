from typing import Optional, List
from datetime import datetime
from pydantic import Field
from beanie import Document
from beanie import PydanticObjectId as ObjectId
from app.models.message import Attachment

class DirectMessage(Document):
    conversationId: ObjectId
    senderId: ObjectId
    content: Optional[str] = None
    isEdited: bool = False
    editedAt: Optional[datetime] = None
    deleted: bool = False
    deletedAt: Optional[datetime] = None
    attachments: List[Attachment] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "directmessages"
        indexes = [
            [("conversationId", 1), ("createdAt", 1)]
        ]
