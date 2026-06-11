from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.routers import auth, audit, dashboard, evaluations, governance, prompts, tests, versions

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PromptHub API",
    description="Enterprise Prompt Management System — version control, governance, and quality for AI prompts.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in [auth.router, prompts.router, versions.router, evaluations.router,
               tests.router, governance.router, dashboard.router, audit.router]:
    app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "prompthub-api"}
