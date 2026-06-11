from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from typing import List
import cloudinary
import cloudinary.uploader

from app.core.config import settings
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret
)

@router.post("")
async def upload_files(
    attachments: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    results = []
    for file in attachments:
        try:
            result = cloudinary.uploader.upload(
                file.file,
                resource_type="auto",
                folder="discord_clone_uploads"
            )
            results.append({
                "url": result.get("secure_url"),
                "publicId": result.get("public_id"),
                "fileName": file.filename,
                "fileSize": result.get("bytes", 0),
                "mimeType": file.content_type or "application/octet-stream",
                "resourceType": result.get("resource_type", "raw"),
                "uploadedAt": None
            })
        except Exception as e:
            print("Upload Error:", e)
            raise HTTPException(status_code=500, detail=f"Failed to upload {file.filename}")
    return results
