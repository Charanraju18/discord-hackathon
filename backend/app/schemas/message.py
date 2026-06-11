from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from beanie import PydanticObjectId as ObjectId
from app.schemas.user import UserResponse
from app.schemas.dm import Attachment
from app.models.message import Reaction

class MessageCreate(BaseModel):
    content: Optional[str] = None
    attachments: List[Attachment] = []

class MessageResponse(BaseModel):
    id: ObjectId
    channelId: ObjectId
    serverId: ObjectId
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

class MessageEditRequest(BaseModel):
    content: str
