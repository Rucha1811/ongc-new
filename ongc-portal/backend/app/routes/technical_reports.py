from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import or_
from sqlalchemy.future import select
from app.database import get_db
from app.models.base import TechnicalReport, User
from app.auth.deps import get_current_user
from datetime import datetime
import json, openpyxl, re
from io import BytesIO

router = APIRouter()

CATEGORIES = [
    "Reconnaissance Reports",
    "Project Reports",
    "Operations Reports",
    "Field Observer Logs",
]


@router.get("/")
async def list_reports(
    category: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role_name = current_user.role.name if current_user.role else "viewer"
    q = select(TechnicalReport).order_by(TechnicalReport.created_at.desc())
    if category:
        q = q.where(TechnicalReport.category == category)
    if role_name != "admin":
        if role_name == "ops_manager":
            mu = await db.execute(select(User.id).where(User.ops_manager_id == current_user.id))
            managed_ids = {current_user.id} | {row[0] for row in mu}
            q = q.where(TechnicalReport.created_by.in_(managed_ids))
        else:
            q = q.where(TechnicalReport.created_by == current_user.id)
    result = await db.execute(q)
    items = result.scalars().all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "category": r.category,
            "author": r.author or (r.creator.name if r.creator else ""),
            "status": r.status,
            "created_by": r.created_by,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in items
    ]


@router.post("/create")
async def create_report(
    title: str,
    category: str = None,
    author: str = None,
    status: str = "Draft",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = current_user.role.name if current_user.role else ""
    if role not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    if category and category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {', '.join(CATEGORIES)}")
    report = TechnicalReport(
        title=title,
        category=category or "Project Reports",
        author=author or current_user.name,
        status=status,
        created_by=current_user.id,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return {
        "id": report.id,
        "title": report.title,
        "category": report.category,
        "author": report.author,
        "status": report.status,
        "created_by": report.created_by,
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }


@router.put("/{report_id}")
async def update_report(
    report_id: int,
    title: str = None,
    category: str = None,
    author: str = None,
    status: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = current_user.role.name if current_user.role else ""
    if role not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    result = await db.execute(select(TechnicalReport).where(TechnicalReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if title:
        report.title = title
    if category:
        if category not in CATEGORIES:
            raise HTTPException(status_code=400, detail=f"Invalid category")
        report.category = category
    if author:
        report.author = author
    if status:
        report.status = status
    report.updated_at = datetime.utcnow()
    await db.commit()
    return {"success": True, "report_id": report_id}


@router.delete("/{report_id}")
async def delete_report(
    report_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = current_user.role.name if current_user.role else ""
    if role not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    result = await db.execute(select(TechnicalReport).where(TechnicalReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.delete(report)
    await db.commit()
    return {"success": True, "report_id": report_id}

REPORT_COLUMN_SYNONYMS = {
    "title": ["title", "report title", "name", "report name"],
    "category": ["category", "type", "report category", "report type"],
    "author": ["author", "creator", "prepared by", "name", "reporter"],
    "status": ["status", "state", "stage", "report status"],
}

def _norm_rep(s, syn_map):
    s = s.strip().lower()
    s = re.sub(r'\s+', ' ', s)
    for field, synonyms in syn_map.items():
        for syn in synonyms:
            if s == syn or s.startswith(syn) or syn.startswith(s):
                return field
    return None

@router.post("/upload-excel/preview")
async def report_excel_preview(
    file: UploadFile = File(...),
    sheet_name: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager"):
        raise HTTPException(403, "Only admin/ops_manager can upload Excel")
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(400, "Only .xlsx files are supported")
    contents = await file.read()
    wb = openpyxl.load_workbook(BytesIO(contents), data_only=True)
    sheets = wb.sheetnames
    if sheet_name and sheet_name in sheets:
        ws = wb[sheet_name]
    else:
        ws = wb.active
        sheet_name = ws.title
    headers = [c.value for c in ws[1] if c.value]
    auto_mapping = {}
    unmapped = []
    for h in headers:
        field = _norm_rep(h, REPORT_COLUMN_SYNONYMS)
        if field:
            auto_mapping[h] = field
        else:
            unmapped.append(h)
    preview = []
    for r in range(2, min(7, ws.max_row + 1)):
        row_data = {}
        for ci, c in enumerate(ws[r]):
            if ci < len(headers):
                row_data[headers[ci]] = str(c.value) if c.value is not None else ""
        if any(row_data.values()):
            preview.append(row_data)
    title_header = next((k for k,v in auto_mapping.items() if v=="title"), None)
    existing = set()
    dup_rows = 0
    if title_header and title_header in headers:
        result = await db.execute(select(TechnicalReport.title))
        existing = set(row[0] for row in result if row[0])
        col_idx = headers.index(title_header)
        for r in range(2, ws.max_row + 1):
            val = ws.cell(row=r, column=col_idx + 1).value
            if val and str(val).strip() in existing:
                dup_rows += 1
    wb.close()
    return {
        "auto": len(unmapped) == 0,
        "sheet_name": sheet_name,
        "sheets": sheets,
        "columns": headers,
        "row_count": max(0, ws.max_row - 1),
        "preview": preview,
        "auto_mapping": auto_mapping,
        "unmapped": unmapped,
        "duplicate_count": dup_rows,
    }

@router.post("/upload-excel/import", status_code=201)
async def report_excel_import(
    file: UploadFile = File(...),
    mapping: str = Form(...),
    sheet_name: str = Form(None),
    conflict: str = Form("skip"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager"):
        raise HTTPException(403, "Only admin/ops_manager can import Excel")
    mapping_dict = json.loads(mapping)
    contents = await file.read()
    wb = openpyxl.load_workbook(BytesIO(contents), data_only=True)
    if sheet_name and sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
    else:
        ws = wb.active
    headers = [c.value for c in ws[1] if c.value]
    col_idx = {h: i for i, h in enumerate(headers)}
    valid_fields = {"title","category","author","status"}
    title_header = next((k for k,v in mapping_dict.items() if v=="title"), None)
    existing_names = set()
    if conflict == "skip" and title_header:
        result = await db.execute(select(TechnicalReport.title))
        existing_names = set(row[0] for row in result if row[0])
    imported = 0
    skipped = 0
    for r in range(2, ws.max_row + 1):
        row_data = {}
        has_data = False
        for col_name, field_name in mapping_dict.items():
            if col_name in col_idx and field_name in valid_fields:
                val = ws.cell(row=r, column=col_idx[col_name] + 1).value
                if val is not None:
                    row_data[field_name] = str(val).strip()
                    if field_name == "title":
                        has_data = True
        if not has_data:
            continue
        rname = row_data.get("title", f"Imported-{r}")
        if rname in existing_names:
            skipped += 1
            continue
        report = TechnicalReport(
            title=rname,
            category=row_data.get("category", "Project Reports"),
            author=row_data.get("author"),
            status=row_data.get("status", "Draft"),
            created_by=user.id,
        )
        db.add(report)
        imported += 1
    await db.commit()
    wb.close()
    return {"imported": imported, "skipped": skipped, "msg": f"{imported} reports imported, {skipped} duplicates skipped"}
