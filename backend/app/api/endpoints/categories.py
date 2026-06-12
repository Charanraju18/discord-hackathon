from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId as ObjectId
from app.models.user import User
from app.models.server import Server
from app.models.channel import Channel
from app.models.category import Category
from app.api.deps import get_current_user
from app.sockets import sio

router = APIRouter()

def _cat_dict(c: Category) -> dict:
    return {"id": str(c.id), "serverId": str(c.serverId), "name": c.name, "position": c.position, "createdAt": str(c.createdAt)}

@router.get("/{server_id}")
async def get_categories(server_id: str, current_user: User = Depends(get_current_user)):
    s_id = ObjectId(server_id)
    server = await Server.get(s_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    if current_user.id not in server.members:
        raise HTTPException(status_code=403, detail="Not authorized")
    cats = await Category.find({"serverId": s_id}).sort("position").to_list()
    return [_cat_dict(c) for c in cats]

@router.post("")
async def create_category(req: dict, current_user: User = Depends(get_current_user)):
    server_id = ObjectId(req.get("serverId"))
    server = await Server.get(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    if current_user.id not in server.members:
        raise HTTPException(status_code=403, detail="Not authorized")
    count = await Category.find({"serverId": server_id}).count()
    cat = Category(serverId=server_id, name=req.get("name", "New Category"), position=count, createdBy=current_user.id)
    await cat.insert()
    payload = _cat_dict(cat)
    await sio.emit("category_created", payload, room=f"server:{str(server_id)}")
    return payload

@router.delete("/{category_id}")
async def delete_category(category_id: str, current_user: User = Depends(get_current_user)):
    cat = await Category.get(ObjectId(category_id))
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    server = await Server.get(cat.serverId)
    if not server or current_user.id not in server.members:
        raise HTTPException(status_code=403, detail="Not authorized")
    child_channels = await Channel.find({"categoryId": cat.id}).to_list()
    deleted_ids = [str(c.id) for c in child_channels]
    for ch in child_channels:
        await ch.delete()
    await cat.delete()
    payload = {"categoryId": category_id, "serverId": str(cat.serverId), "deletedChannelIds": deleted_ids}
    await sio.emit("category_deleted", payload, room=f"server:{str(cat.serverId)}")
    return {"success": True}
