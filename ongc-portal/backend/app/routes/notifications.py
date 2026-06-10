from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models.base import Notification, User
from app.auth.deps import get_current_user
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class NotifOut(BaseModel):
    id: int
    user_id: int
    message: str
    is_read: bool
    created_at: str | None = None
    class Config:
        from_attributes = True

@router.get("/", response_model=list[NotifOut])
async def list_notifications(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Notification).where(Notification.user_id == current_user.id).order_by(Notification.created_at.desc())
    )
    notifs = result.scalars().all()
    out = []
    for n in notifs:
        out.append({
            "id": n.id,
            "user_id": n.user_id,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        })
    return out

@router.post("/mark-read/{notification_id}")
async def mark_notification_read(notification_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Notification).where(Notification.id == notification_id, Notification.user_id == current_user.id))
    notification = result.scalar_one_or_none()
    if not notification:
        return {"success": False}
    notification.is_read = True
    await db.commit()
    return {"success": True}

@router.post("/mark-all-read")
async def mark_all_notifications_read(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Notification).where(Notification.user_id == current_user.id, Notification.is_read == False))
    for n in result.scalars().all():
        n.is_read = True
    await db.commit()
    return {"success": True}
