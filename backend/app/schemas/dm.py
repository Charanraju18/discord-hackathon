from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from beanie import PydanticObjectId as ObjectId
from app.schemas.user import UserResponse
from app.models.message import Reaction

class Attachment(BaseModel):
    url: str
    publicId: str = ""
    fileName: str = ""
    fileSize: int = 0
    mimeType: str = ""
    resourceType: str = "raw"
    uploadedAt: Optional[datetime] = None

class DirectMessageCreate(BaseModel):
    content: Optional[str] = None
    attachments: List[Attachment] = []

class DirectMessageResponse(BaseModel):
    id: ObjectId
    conversationId: ObjectId
    sender: UserResponse
    content: Optional[str] = None
    isEdited: bool = False
    editedAt: Optional[datetime] = None
    deleted: bool = False
    deletedAt: Optional[datetime] = None
    attachments: List[Attachment] = []
    reactions: List[Reaction] = []
    createdAt: datetime
    updatedAt: datetime

class DirectConversationResponse(BaseModel):
    id: ObjectId
    participants: List[UserResponse]
    lastMessageId: Optional[ObjectId] = None
    createdAt: datetime
    updatedAt: datetime
    
class StartDMRequest(BaseModel):
    friendId: str
