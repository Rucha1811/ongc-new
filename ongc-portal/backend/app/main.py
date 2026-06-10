from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import auth, users, files, approvals, dashboard, reports, notifications, database, permissions, lookup as lookup_routes, ai as ai_routes, activity
from app.models.base import Base
from app.database import engine
from app.ai.vector_store import vector_store

app = FastAPI(title="ONGC Advance Data Repository API", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        if settings.PGVECTOR_ENABLED:
            await vector_store.ensure_extension()
    except Exception as e:
        print(f"[startup] AI tables/pgvector: {e}")

@app.get("/")
def root():
    return {"msg": "ONGC Advance Data Repository API running."}

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
app.include_router(approvals.router, prefix="/api/approvals", tags=["approvals"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(database.router, prefix="/api/db", tags=["database"])
app.include_router(lookup_routes.router, prefix="/api/lookup", tags=["lookup"])
app.include_router(permissions.router, prefix="/api/permissions", tags=["permissions"])
app.include_router(ai_routes.router, prefix="/api/ai", tags=["ai"])
app.include_router(activity.router, prefix="/api/activity", tags=["activity"])
