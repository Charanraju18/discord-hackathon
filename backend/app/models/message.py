from typing import Optional, List
from datetime import datetime
from pydantic import Field, BaseModel
from beanie import Document
from beanie import PydanticObjectId as ObjectId

class Attachment(BaseModel):
    url: str
    publicId: str
    fileName: str
    fileSize: int
    mimeType: str
    resourceType: str
    uploadedAt: Optional[datetime] = None

class Reaction(BaseModel):
    emoji: str
    users: List[str]


class Message(Document):
    content: Optional[str] = None
    senderId: ObjectId
    channelId: ObjectId
    isEdited: bool = False
    editedAt: Optional[datetime] = None
    deleted: bool = False
    deletedAt: Optional[datetime] = None
    attachments: List[Attachment] = []
    reactions: List[Reaction] = []
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "messages"
