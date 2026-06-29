from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.routes import auth, users, files, approvals, dashboard, reports, notifications, database, permissions, lookup as lookup_routes, ai as ai_routes, activity, projects, targets, highlights, technical_reports, report_builder, progress_reports, manpower_status, contract_status, fund_management, data_processing, regional_lab, reporting_appraisals, pending_issues, hse_incidents, awp_items, requests, knowledge, acquisition_targets
from app.models.base import Base
from app.database import engine
from app.ai.vector_store import vector_store

app = FastAPI(title="Data Vision API", version="2.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os, sys
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.isdir(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
else:
    print(f"[startup] WARNING: static dir not found at {static_dir}", file=sys.stderr)

@app.on_event("startup")
async def startup():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        if settings.PGVECTOR_ENABLED:
            await vector_store.ensure_extension()
    except Exception as e:
        print(f"[startup] DB/pgvector: {e}")

    # Pre-load embedding model so first upload/search isn't slow
    try:
        import time
        t0 = time.time()
        print("[startup] Loading embedding model...")
        from app.utils.embeddings import get_model
        get_model()
        print(f"[startup] Model loaded in {time.time()-t0:.1f}s")
    except Exception as e:
        print(f"[startup] Model load error (will load on demand): {e}")

@app.get("/")
def root():
    return {"msg": "Data Vision API running."}

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
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(targets.router, prefix="/api/targets", tags=["targets"])
app.include_router(highlights.router, prefix="/api/highlights", tags=["highlights"])
app.include_router(technical_reports.router, prefix="/api/technical-reports", tags=["technical-reports"])
app.include_router(report_builder.router, prefix="/api/report-builder", tags=["report-builder"])
app.include_router(progress_reports.router, prefix="/api/progress-reports", tags=["progress-reports"])
app.include_router(manpower_status.router, prefix="/api/manpower-status", tags=["manpower-status"])
app.include_router(contract_status.router, prefix="/api/contract-status", tags=["contract-status"])
app.include_router(fund_management.router, prefix="/api/fund-management", tags=["fund-management"])
app.include_router(data_processing.router, prefix="/api/data-processing", tags=["data-processing"])
app.include_router(regional_lab.router, prefix="/api/regional-lab", tags=["regional-lab"])
app.include_router(reporting_appraisals.router, prefix="/api/reporting-appraisals", tags=["reporting-appraisals"])
app.include_router(pending_issues.router, prefix="/api/pending-issues", tags=["pending-issues"])
app.include_router(hse_incidents.router, prefix="/api/hse-incidents", tags=["hse-incidents"])
app.include_router(awp_items.router, prefix="/api/awp-items", tags=["awp-items"])

app.include_router(requests.router, prefix="/api/requests", tags=["Requests"])
app.include_router(knowledge.router, prefix="/api/knowledge", tags=["Knowledge"])
app.include_router(acquisition_targets.router, prefix="/api/stage2", tags=["Stage-II DataVision"])
