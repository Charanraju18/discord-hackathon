from fastapi import APIRouter, Depends, Query
from typing import List
from app.models.user import User
from app.schemas.user import UserResponse
from app.api.deps import get_current_user
import re

router = APIRouter()

@router.get("/search", response_model=List[UserResponse])
async def search_users(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user)
):
    # Regex search for username
    regex = re.compile(f".*{q}.*", re.IGNORECASE)
    users = await User.find({"username": regex, "_id": {"$ne": current_user.id}}).to_list()
    return [UserResponse.model_validate(u) for u in users]
