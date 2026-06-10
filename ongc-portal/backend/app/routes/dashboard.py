from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.base import File, User
from app.auth.deps import get_current_user

router = APIRouter()

@router.get("/stats")
async def dashboard_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(File).options(selectinload(File.uploader))
    )
    files = result.scalars().all()

    total = len(files)
    approved = sum(1 for f in files if f.status == "Approved")
    pending  = sum(1 for f in files if f.status == "Pending")
    rejected = sum(1 for f in files if f.status == "Rejected")

    by_section = {}
    by_type = {}
    by_classification = {}

    for f in files:
        if f.section:
            by_section[f.section] = by_section.get(f.section, 0) + 1
        if f.file_type:
            by_type[f.file_type] = by_type.get(f.file_type, 0) + 1
        if f.classification:
            by_classification[f.classification] = by_classification.get(f.classification, 0) + 1

    recent_activity = sorted(
        files,
        key=lambda x: x.upload_date or x.created_at,
        reverse=True
    )[:5]

    return {
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "bySection": by_section,
        "byType": by_type,
        "byClassification": by_classification,
        "recentActivity": [
            {
                "id": f.id,
                "fileName": f.file_name,
                "section": f.section,
                "category": f.category,
                "uploadedByName": f.uploader.name if f.uploader else str(f.uploaded_by),
                "uploadDate": f.upload_date.isoformat() if f.upload_date else None,
                "status": f.status,
            }
            for f in recent_activity
        ]
    }
