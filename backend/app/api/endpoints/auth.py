from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from datetime import timedelta
from beanie import PydanticObjectId as ObjectId
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, AuthResponse
from app.core.security import get_password_hash, verify_password, create_access_token
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=AuthResponse)
async def register(user_in: UserCreate):
    user_exists = await User.find_one({"$or": [{"email": user_in.email}, {"username": user_in.username}]})
    if user_exists:
        raise HTTPException(
            status_code=400,
            detail="User with this email or username already exists"
        )
    
    user = User(
        username=user_in.username,
        email=user_in.email,
        password=get_password_hash(user_in.password),
    )
    await user.insert()
    
    token = create_access_token(str(user.id))
    return AuthResponse(token=token, user=UserResponse.model_validate(user))

@router.post("/login", response_model=AuthResponse)
async def login(user_in: UserLogin):
    user = await User.find_one({"email": user_in.email})
    if not user or not user.password:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    if not verify_password(user_in.password, user.password):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    token = create_access_token(str(user.id))
    return AuthResponse(token=token, user=UserResponse.model_validate(user))

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(req: ForgotPassword):
    # In a real app, send an email. For this hackathon, we'll just return a success message
    # or return the token directly for testing.
    user = await User.find_one({"email": req.email})
    if not user:
        # Don't reveal user existence
        return {"message": "If that email exists, a reset link has been sent."}
    
    # Generate a short-lived token
    reset_token = create_access_token(str(user.id), expires_delta=timedelta(hours=1))
    # In reality, this token should be emailed.
    return {"message": "If that email exists, a reset link has been sent.", "debug_token": reset_token}

@router.post("/reset-password")
async def reset_password(req: ResetPassword):
    payload = verify_access_token(req.token)
    if not payload:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    user_id = payload.get("id")
    user = await User.get(ObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.password = get_password_hash(req.new_password)
    await user.save()
    return {"message": "Password has been reset successfully"}

