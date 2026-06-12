from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models import (
    User, Server, Channel, Message,
    DirectConversation, DirectMessage, FriendRequest,
    Friendship, ServerInvitation, Invite, Notification, Category
)

async def init_db():
    # Create Motor client
    client = AsyncIOMotorClient(settings.mongodb_uri)

    # Get database instance. Use "test" if default is not available in URI.
    db = client.get_database("test")
    
    # Init beanie with the Document class
    await init_beanie(
        database=db,
        document_models=[
            User,
            Server,
            Channel,
            Message,
            DirectConversation,
            DirectMessage,
            FriendRequest,
            Friendship,
            ServerInvitation,
            Invite,
            Notification,
            Category
        ]
    )
