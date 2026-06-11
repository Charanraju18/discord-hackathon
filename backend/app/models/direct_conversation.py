from typing import Optional, List, Dict
from datetime import datetime
from pydantic import Field
from beanie import Document
from beanie import PydanticObjectId as ObjectId

class DirectConversation(Document):
    participants: List[ObjectId]
    lastMessageId: Optional[ObjectId] = None
    readStates: Dict[str, datetime] = Field(default_factory=dict)
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "directconversations"
