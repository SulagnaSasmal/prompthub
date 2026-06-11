from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://prompthub:prompthub@localhost:5432/prompthub"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    class Config:
        env_file = ".env"


settings = Settings()
