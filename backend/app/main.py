from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app import models as _models
from app.routers import auth, audit, dashboard, evaluations, governance, prompts, tests, versions, webhooks, workflow_v2

_ = _models


def _ensure_additive_columns():
    dialect = engine.dialect.name
    if dialect not in {"sqlite", "postgresql"}:
        return
    with engine.connect() as conn:
        existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(prompts)")} if dialect == "sqlite" else {
            row[0]
            for row in conn.exec_driver_sql(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'prompts'"
            )
        }
        if dialect == "sqlite":
            additions = {
                "task_type": "ALTER TABLE prompts ADD COLUMN task_type VARCHAR(40) NOT NULL DEFAULT 'General Writing'",
                "usage_notes": "ALTER TABLE prompts ADD COLUMN usage_notes TEXT NOT NULL DEFAULT ''",
                "style_profile_id": "ALTER TABLE prompts ADD COLUMN style_profile_id CHAR(32)",
                "run_count": "ALTER TABLE prompts ADD COLUMN run_count INTEGER NOT NULL DEFAULT 0",
            }
        else:
            additions = {
                "task_type": "ALTER TABLE prompts ADD COLUMN task_type VARCHAR(40) NOT NULL DEFAULT 'General Writing'",
                "usage_notes": "ALTER TABLE prompts ADD COLUMN usage_notes TEXT NOT NULL DEFAULT ''",
                "style_profile_id": "ALTER TABLE prompts ADD COLUMN style_profile_id UUID REFERENCES style_profiles(style_profile_id)",
                "run_count": "ALTER TABLE prompts ADD COLUMN run_count INTEGER NOT NULL DEFAULT 0",
            }
        for column, ddl in additions.items():
            if column not in existing:
                conn.exec_driver_sql(ddl)
        conn.commit()

Base.metadata.create_all(bind=engine)
_ensure_additive_columns()

app = FastAPI(
    title="PromptHub API",
    description="Enterprise Prompt Management System — version control, governance, and quality for AI prompts.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

_origins = ["*"] if settings.cors_origins.strip() == "*" else [o.strip() for o in settings.cors_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in [auth.router, prompts.router, versions.router, evaluations.router,
               tests.router, governance.router, dashboard.router, audit.router, workflow_v2.router, webhooks.router]:
    app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "prompthub-api"}
