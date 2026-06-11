from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from beanie import PydanticObjectId

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: PydanticObjectId
    username: str
    email: EmailStr
    isOnline: bool
    lastSeen: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    token: str

class AuthResponse(BaseModel):
    token: str
    user: UserResponse
