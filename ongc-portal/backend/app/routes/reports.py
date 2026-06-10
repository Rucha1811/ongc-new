from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models.base import File, Approval, User
from app.auth.deps import get_current_user
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/monthly")
async def monthly_report(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Example: count files uploaded per month for last 12 months
    result = await db.execute(select(File))
    files = result.scalars().all()
    now = datetime.utcnow()
    months = [(now.year, now.month - i) for i in range(12)]
    month_counts = {}
    for y, m in months:
        key = f"{y}-{m:02d}"
        month_counts[key] = 0
    for f in files:
        if f.upload_date:
            key = f"{f.upload_date.year}-{f.upload_date.month:02d}"
            if key in month_counts:
                month_counts[key] += 1
    return month_counts

@router.get("/user-activity")
async def user_activity_report(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Example: count files uploaded by each user
    result = await db.execute(select(File))
    files = result.scalars().all()
    user_counts = {}
    for f in files:
        uid = f.uploaded_by
        user_counts[uid] = user_counts.get(uid, 0) + 1
    return user_counts
