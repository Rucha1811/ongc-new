from app.models.base import ActivityLog
from sqlalchemy.ext.asyncio import AsyncSession


async def log_activity(
    db: AsyncSession,
    user_id: int,
    action: str,
    target_type: str,
    target_id: int = None,
    details: str = None,
):
    entry = ActivityLog(
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
    )
    db.add(entry)
