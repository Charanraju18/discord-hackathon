from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import cloudinary
import cloudinary.uploader
import os

from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

# Configure cloudinary here. Ideally from environment variables, but falling back for the hackathon
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    try:
        # Check size and type if needed
        # Cloudinary supports direct upload from file stream
        result = cloudinary.uploader.upload(
            file.file,
            resource_type="auto",
            folder="discord_clone_uploads"
        )
        
        return {
            "success": True,
            "data": {
                "url": result.get("secure_url"),
                "filename": file.filename,
                "contentType": file.content_type,
                "public_id": result.get("public_id"),
                "format": result.get("format"),
                "resource_type": result.get("resource_type")
            }
        }
    except Exception as e:
        print("Upload Error:", e)
        raise HTTPException(status_code=500, detail="Failed to upload file")
