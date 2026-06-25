from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.base import ActivityLog, File, User
from app.auth.deps import get_current_user
from datetime import datetime, timedelta, timezone
import io
import openpyxl

router = APIRouter()


async def _scope_files_for_user(db: AsyncSession, user: User, since: datetime) -> list:
    """Filter files visible to the user based on role, area, and section."""
    result = await db.execute(
        select(File).where(File.created_at >= since)
    )
    all_files = result.scalars().all()

    role_name = user.role.name if user.role else "viewer"
    if role_name == "admin":
        return list(all_files)

    if role_name == "ops_manager":
        mu_res = await db.execute(
            select(User.id).where(User.ops_manager_id == user.id)
        )
        managed_user_ids = {row[0] for row in mu_res.all()}
        ma_res = await db.execute(
            select(User.area, User.section).where(
                User.ops_manager_id == user.id,
            )
        )
        managed_areas = set()
        for area, section in ma_res.all():
            if area:
                managed_areas.add(area)
            if section:
                managed_areas.add(section)
        if user.area:
            managed_areas.add(user.area)
        if user.section:
            managed_areas.add(user.section)
        scoped = []
        for f in all_files:
            if f.uploaded_by == user.id:
                scoped.append(f)
                continue
            in_managed = f.uploaded_by in managed_user_ids or (managed_areas and f.section in managed_areas)
            if in_managed:
                scoped.append(f)
        return scoped

    # data_creator / viewer
    scoped = []
    for f in all_files:
        if f.uploaded_by == user.id:
            scoped.append(f)
            continue
        matches_area = (user.area and f.section == user.area) or (user.section and f.section == user.section)
        matches_category = not user.user_category or f.category == user.user_category
        has_filter = user.area or user.section or user.user_category
        if has_filter and not (matches_area or matches_category):
            continue
        scoped.append(f)
    return scoped


@router.get("/summary")
async def activity_summary(
    period: str = Query("week", pattern="^(week|month)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    if period == "week":
        since = now - timedelta(days=7)
    else:
        since = now - timedelta(days=30)

    all_files = await _scope_files_for_user(db, current_user, since)

    total_uploads = len(all_files)
    uploads_by_section = {}
    uploads_by_classification = {}
    for f in all_files:
        s = f.section or "Unknown"
        uploads_by_section[s] = uploads_by_section.get(s, 0) + 1
        c = f.classification or "Unknown"
        uploads_by_classification[c] = uploads_by_classification.get(c, 0) + 1

    approved_files = [f for f in all_files if f.status == "Approved"]
    total_approvals = len(approved_files)
    approvals_by_section = {}
    approvals_by_classification = {}
    for f in approved_files:
        s = f.section or "Unknown"
        approvals_by_section[s] = approvals_by_section.get(s, 0) + 1
        c = f.classification or "Unknown"
        approvals_by_classification[c] = approvals_by_classification.get(c, 0) + 1

    rejected_files = [f for f in all_files if f.status == "Rejected"]
    total_rejections = len(rejected_files)

    # Pending files (all time, scoped)
    result_pend = await db.execute(
        select(File).where(File.status == "Pending").order_by(File.created_at.asc())
    )
    pending_all = result_pend.scalars().all()
    role_name = current_user.role.name if current_user.role else "viewer"
    if role_name == "admin":
        pending_files = pending_all
    else:
        pending_ids = {f.id for f in all_files}
        pending_files = [f for f in pending_all if f.id in pending_ids]
    total_pending = len(pending_files)

    # --- Activity log (file actions only) ---
    result_logs = await db.execute(
        select(ActivityLog)
        .where(
            and_(
                ActivityLog.timestamp >= since,
                ActivityLog.action.in_(["upload", "approve", "reject"]),
            )
        )
        .order_by(ActivityLog.timestamp.desc())
    )
    logs = result_logs.scalars().all()

    daily_counts = {}
    for log in logs:
        day = log.timestamp.strftime("%Y-%m-%d") if log.timestamp else "unknown"
        daily_counts[day] = daily_counts.get(day, 0) + 1

    # Timeline by action type
    timeline_by_action = {"upload": {}, "approve": {}, "reject": {}}
    for log in logs:
        day = log.timestamp.strftime("%Y-%m-%d") if log.timestamp else "unknown"
        a = log.action
        if a in timeline_by_action:
            timeline_by_action[a][day] = timeline_by_action[a].get(day, 0) + 1

    return {
        "period": period,
        "since": since.isoformat(),
        "totalUploads": total_uploads,
        "totalApprovals": total_approvals,
        "totalRejections": total_rejections,
        "totalPending": total_pending,
        "uploadsBySection": uploads_by_section,
        "uploadsByClassification": uploads_by_classification,
        "approvalsBySection": approvals_by_section,
        "approvalsByClassification": approvals_by_classification,
        "byDate": dict(sorted(daily_counts.items())),
        "timelineByAction": timeline_by_action,
        "pendingFiles": [
            {
                "id": f.id,
                "fileName": f.file_name,
                "section": f.section,
                "classification": f.classification,
                "uploadedBy": f.uploaded_by,
                "uploadDate": f.created_at.isoformat() if f.created_at else None,
                "daysPending": (now - f.created_at).days if f.created_at else 0,
            }
            for f in pending_files
        ],
        "recentActivity": [
            {
                "id": log.id,
                "action": log.action,
                "details": log.details,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            }
            for log in logs[:50]
        ],
    }


@router.get("/export")
async def export_activity(
    period: str = Query("week", pattern="^(week|month)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    if period == "week":
        since = now - timedelta(days=7)
    else:
        since = now - timedelta(days=30)

    result = await db.execute(
        select(File).where(File.created_at >= since).order_by(File.created_at.desc())
    )
    files = result.scalars().all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = f"Files_{period}"

    ws.append(["ID", "File Name", "Section", "Classification", "Status", "Upload Date", "Uploaded By"])
    for f in files:
        ws.append([
            f.id, f.file_name, f.section, f.classification, f.status,
            f.created_at.strftime("%Y-%m-%d %H:%M") if f.created_at else "",
            f.uploaded_by,
        ])

    ws2 = wb.create_sheet("Summary")
    ws2.append(["Files Summary"])
    ws2.append([f"Period: Last {period}"])
    ws2.append([])

    total = len(files)
    approved = sum(1 for f in files if f.status == "Approved")
    pending = sum(1 for f in files if f.status == "Pending")
    rejected = sum(1 for f in files if f.status == "Rejected")
    ws2.append(["Total Files", total])
    ws2.append(["Approved", approved])
    ws2.append(["Pending", pending])
    ws2.append(["Rejected", rejected])

    ws2.append([])
    ws2.append(["Approvals by Section"])
    sections = {}
    for f in files:
        if f.status == "Approved":
            s = f.section or "Unknown"
            sections[s] = sections.get(s, 0) + 1
    ws2.append(["Section", "Count"])
    for s, c in sorted(sections.items(), key=lambda x: -x[1]):
        ws2.append([s, c])

    ws2.append([])
    ws2.append(["Approvals by Classification"])
    classes = {}
    for f in files:
        if f.status == "Approved":
            c = f.classification or "Unknown"
            classes[c] = classes.get(c, 0) + 1
    ws2.append(["Classification", "Count"])
    for c, cnt in sorted(classes.items(), key=lambda x: -x[1]):
        ws2.append([c, cnt])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=files_{period}_{now.strftime('%Y%m%d')}.xlsx"},
    )
