from pydantic_settings import BaseSettings


#### Centralise toutes les variables d'environnement de l'application
class Settings(BaseSettings):
    postgres_user: str = "formbuilder"
    postgres_password: str = "changeme"
    postgres_db: str = "formbuilder"
    postgres_host: str = "db"
    postgres_port: int = 5432

    @property
    def database_url(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    class Config:
        env_file = ".env"


settings = Settings()
