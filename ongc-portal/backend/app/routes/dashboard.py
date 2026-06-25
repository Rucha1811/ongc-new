from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_
from app.database import get_db
from app.models.base import File, User, UserPermission, ProgressReport, ManpowerStatus, ContractStatus, FundManagement, DataProcessingItem, RegionalLabEquipment, ReportingAppraisal, PendingIssue, HSEIncident, AWPItem
from app.auth.deps import get_current_user

router = APIRouter()

async def _get_scope_files(db: AsyncSession, user: User) -> list:
    """Return files visible to the current user based on their role."""
    result = await db.execute(
        select(File).options(selectinload(File.uploader))
    )
    all_files = result.scalars().all()

    if user.role.name == "admin":
        return list(all_files)

    if user.role.name == "ops_manager":
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

    # Data Creator / Viewer
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


@router.get("/stats")
async def dashboard_stats(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    files = await _get_scope_files(db, current_user)

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

async def _get_scoped_ids(db: AsyncSession, user: User):
    """Return (managed_user_ids, managed_sections) for ops_manager scope."""
    mu_res = await db.execute(select(User.id).where(User.ops_manager_id == user.id))
    managed_user_ids = {row[0] for row in mu_res.all()}
    ma_res = await db.execute(select(User.area, User.section).where(User.ops_manager_id == user.id))
    managed_sections = set()
    for area, section in ma_res.all():
        if area: managed_sections.add(area)
        if section: managed_sections.add(section)
    if user.area: managed_sections.add(user.area)
    if user.section: managed_sections.add(user.section)
    return managed_user_ids, managed_sections

async def _scope_module_query(model_cls, db, user, has_section):
    """Build a scoped query for the given model based on user role."""
    role = user.role.name
    if role == "admin":
        q = select(model_cls)
    elif role == "ops_manager":
        managed_ids, managed_sections = await _get_scoped_ids(db, user)
        managed_ids.add(user.id)
        if has_section and managed_sections:
            q = select(model_cls).where(
                or_(model_cls.created_by.in_(managed_ids), model_cls.section.in_(managed_sections))
            )
        else:
            q = select(model_cls).where(model_cls.created_by.in_(managed_ids))
    elif has_section:
        q = select(model_cls).where(
            or_(
                model_cls.section == user.section,
                model_cls.section == user.area,
                model_cls.created_by == user.id,
            )
        )
    else:
        q = select(model_cls).where(model_cls.created_by == user.id)
    return q.order_by(model_cls.created_at.desc())

HAS_SECTION = {"dataProcessing", "regionalLab", "reportingAppraisals"}

@router.get("/module-summary")
async def module_summary(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    MODELS = {
        "progressReports": ProgressReport,
        "manpowerStatus": ManpowerStatus,
        "contractStatus": ContractStatus,
        "fundManagement": FundManagement,
        "dataProcessing": DataProcessingItem,
        "regionalLab": RegionalLabEquipment,
        "reportingAppraisals": ReportingAppraisal,
        "pendingIssues": PendingIssue,
        "hseIncidents": HSEIncident,
        "awpItems": AWPItem,
    }
    NAME_FIELDS = {
        "progressReports": "project_name",
        "manpowerStatus": "category",
        "contractStatus": "contract",
        "fundManagement": "head",
        "dataProcessing": "project",
        "regionalLab": "equipment",
        "reportingAppraisals": "period",
        "pendingIssues": "description",
        "hseIncidents": "incident_type",
        "awpItems": "activity",
    }
    LABELS = {
        "progressReports": "Progress Reports",
        "manpowerStatus": "Manpower",
        "contractStatus": "Contracts",
        "fundManagement": "Funds",
        "dataProcessing": "Data Proc.",
        "regionalLab": "Lab Equip.",
        "reportingAppraisals": "Reports",
        "pendingIssues": "Issues",
        "hseIncidents": "HSE Incidents",
        "awpItems": "AWP Items",
    }
    result = {}
    total_all = 0
    for key, model_cls in MODELS.items():
        q = await _scope_module_query(model_cls, db, current_user, key in HAS_SECTION)
        rows = (await db.execute(q)).scalars().all()
        name_field = NAME_FIELDS.get(key)
        status_counts = {}
        for r in rows:
            s = getattr(r, "status", None) or "N/A"
            status_counts[s] = status_counts.get(s, 0) + 1
        recent = []
        for r in rows[:5]:
            item = {"id": r.id, "status": getattr(r, "status", None), "created_at": r.created_at.isoformat() if r.created_at else None}
            if name_field:
                item["name"] = getattr(r, name_field, str(r.id))[:80]
            else:
                item["name"] = str(r.id)
            recent.append(item)
        result[key] = {"total": len(rows), "label": LABELS.get(key, key), "status_counts": status_counts, "recent": recent}
        total_all += len(rows)
    return {"modules": result, "total": total_all}
