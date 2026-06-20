from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://prompthub:prompthub@localhost:5432/prompthub"
    secret_key: str = "dev-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    cors_origins: str = "*"
    github_token: str | None = None
    expose_reset_token: bool = True
    auth_rate_limit_per_minute: int = 10

    class Config:
        env_file = ".env"


settings = Settings()
