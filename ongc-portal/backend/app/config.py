from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "ONGC Advance Data Repository"
    API_V1_STR: str = "/api"
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    POSTGRES_SERVER: str
    POSTGRES_PORT: str = "5432"
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    ALLOWED_ORIGINS: List[str] = ["*"]
    UPLOAD_DIR: str = "/Users/ruchatejaskumargandhi/Downloads/Myuploads"

    LLM_PROVIDER: str = "ollama"
    LLM_API_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "llama3.2"
    EMBEDDING_MODEL: str = "nomic-embed-text"
    EMBEDDING_DIM: int = 768
    PGVECTOR_ENABLED: bool = True
    MARKER_ENABLED: bool = False
    PADDLE_ENABLED: bool = True
    REDIS_URL: str = "redis://localhost:6379/0"

    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    MAX_TOKENS: int = 2048
    TEMPERATURE: float = 0.7
    TOP_K_RESULTS: int = 5
    TOP_K_DOCUMENTS: int = 5

    class Config:
        env_file = ".env"

settings = Settings()
