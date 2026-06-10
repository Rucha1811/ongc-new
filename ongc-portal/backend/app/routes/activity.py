from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.database import get_db
from app.models.base import ActivityLog, User
from app.auth.deps import get_current_user
from datetime import datetime, timedelta
import io
import openpyxl

router = APIRouter()


@router.get("/summary")
async def activity_summary(
    period: str = Query("week", regex="^(week|month)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    if period == "week":
        since = now - timedelta(days=7)
    else:
        since = now - timedelta(days=30)

    result = await db.execute(
        select(ActivityLog).where(ActivityLog.timestamp >= since).order_by(ActivityLog.timestamp.desc())
    )
    logs = result.scalars().all()

    # Group by action type
    action_counts = {}
    daily_counts = {}
    user_action_counts = {}
    for log in logs:
        action_counts[log.action] = action_counts.get(log.action, 0) + 1
        day = log.timestamp.strftime("%Y-%m-%d") if log.timestamp else "unknown"
        daily_counts[day] = daily_counts.get(day, 0) + 1
        uid = str(log.user_id)
        if uid not in user_action_counts:
            user_action_counts[uid] = {}
        user_action_counts[uid][log.action] = user_action_counts[uid].get(log.action, 0) + 1

    return {
        "period": period,
        "since": since.isoformat(),
        "total": len(logs),
        "byAction": action_counts,
        "byDate": dict(sorted(daily_counts.items())),
        "logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "action": log.action,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "details": log.details,
            }
            for log in logs[:50]
        ],
    }


@router.get("/export")
async def export_activity(
    period: str = Query("week", regex="^(week|month)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    if period == "week":
        since = now - timedelta(days=7)
    else:
        since = now - timedelta(days=30)

    result = await db.execute(
        select(ActivityLog).where(ActivityLog.timestamp >= since).order_by(ActivityLog.timestamp.desc())
    )
    logs = result.scalars().all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"Activity_{period}"

    ws.append(["ID", "User ID", "Action", "Target Type", "Target ID", "Timestamp", "Details"])
    for log in logs:
        ws.append([
            log.id,
            log.user_id,
            log.action,
            log.target_type,
            log.target_id,
            log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else "",
            log.details,
        ])

    # Summary sheet
    ws2 = wb.create_sheet("Summary")
    action_counts = {}
    daily_counts = {}
    for log in logs:
        action_counts[log.action] = action_counts.get(log.action, 0) + 1
        day = log.timestamp.strftime("%Y-%m-%d") if log.timestamp else "unknown"
        daily_counts[day] = daily_counts.get(day, 0) + 1

    ws2.append(["Activity Summary"])
    ws2.append([f"Period: Last {period}", f"Total: {len(logs)}"])
    ws2.append([])
    ws2.append(["Action", "Count"])
    for action, count in sorted(action_counts.items(), key=lambda x: -x[1]):
        ws2.append([action, count])

    ws2.append([])
    ws2.append(["Date", "Count"])
    for day, count in sorted(daily_counts.items()):
        ws2.append([day, count])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=activity_{period}_{now.strftime('%Y%m%d')}.xlsx"},
    )
