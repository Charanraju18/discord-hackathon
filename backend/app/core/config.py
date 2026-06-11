from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://localhost:27017/discord_clone"
    jwt_secret: str = "fallback_secret"
    port: int = 8000
    
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    model_config = ConfigDict(env_file=".env", extra="ignore")

settings = Settings()
