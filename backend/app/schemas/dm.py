from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from beanie import PydanticObjectId as ObjectId
from app.schemas.user import UserResponse

class Attachment(BaseModel):
    url: str
    filename: str
    contentType: str

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
