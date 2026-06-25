from fastapi import APIRouter, Depends, HTTPException, Form, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.base import Target, TargetAccomplishment, User
from app.auth.deps import get_current_user
import json, openpyxl, re
from io import BytesIO

router = APIRouter()

TARGET_COLUMN_SYNONYMS = {
    "title": ["title", "target", "kpi", "goal", "name", "indicator"],
    "target_value": ["target value", "value", "target_value", "goal value", "target", "numeric value"],
    "unit": ["unit", "units", "measurement", "uom"],
    "section": ["section", "gp", "gp code", "department", "division"],
    "fiscal_year": ["fiscal year", "year", "financial year", "fy", "fiscal_year"],
    "description": ["description", "desc", "notes", "remarks", "comment"],
}

def _normalize_header(col, syn_map):
    s = col.strip().lower()
    s = re.sub(r'\s+', ' ', s)
    for field, synonyms in syn_map.items():
        for syn in synonyms:
            if s == syn or s.startswith(syn) or syn.startswith(s):
                return field
    return None

@router.get("/")
async def list_targets(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Target).options(selectinload(Target.accomplishments), selectinload(Target.creator)).order_by(Target.created_at.desc())
    )
    targets = result.scalars().all()
    out = []
    for t in targets:
        achieved = sum(a.value for a in t.accomplishments) if t.accomplishments else 0
        pct = round((achieved / t.target_value) * 100, 1) if t.target_value else 0
        out.append({
            "id": t.id,
            "title": t.title,
            "target_value": t.target_value,
            "unit": t.unit,
            "section": t.section,
            "fiscal_year": t.fiscal_year,
            "description": t.description,
            "achieved": achieved,
            "pct": pct,
            "created_by_name": t.creator.name if t.creator else None,
            "created_at": str(t.created_at) if t.created_at else None,
            "accomplishments": [{
                "id": a.id,
                "value": a.value,
                "description": a.description,
                "recorded_by_name": a.recorder.name if a.recorder else None,
                "recorded_at": str(a.recorded_at) if a.recorded_at else None,
            } for a in t.accomplishments] if t.accomplishments else [],
        })
    return out

@router.post("/create", status_code=201)
async def create_target(
    title: str = Form(...),
    target_value: float = Form(...),
    unit: str = Form("SKM"),
    section: str = Form(None),
    fiscal_year: str = Form(None),
    description: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager"):
        raise HTTPException(status_code=403, detail="Only admins and ops managers can create targets")
    t = Target(
        title=title,
        target_value=target_value,
        unit=unit,
        section=section,
        fiscal_year=fiscal_year,
        description=description,
        created_by=user.id,
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return {"id": t.id, "title": t.title, "msg": "Target created"}

@router.post("/{target_id}/accomplish")
async def add_accomplishment(
    target_id: int,
    value: float = Form(...),
    description: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(Target).options(selectinload(Target.accomplishments)).where(Target.id == target_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Target not found")
    a = TargetAccomplishment(
        target_id=target_id,
        value=value,
        description=description,
        recorded_by=user.id,
    )
    db.add(a)
    await db.commit()
    achieved = sum(a.value for a in t.accomplishments) + value if t.accomplishments else value
    remaining = t.target_value - achieved
    return {"msg": "Accomplishment recorded", "achieved": achieved, "remaining": max(remaining, 0), "pct": round((achieved / t.target_value) * 100, 1) if t.target_value else 0}

@router.delete("/{target_id}")
async def delete_target(target_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role.name not in ("admin", "ops_manager"):
        raise HTTPException(status_code=403, detail="Only admins and ops managers can delete targets")
    result = await db.execute(select(Target).where(Target.id == target_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Target not found")
    await db.delete(t)
    await db.commit()
    return {"msg": "Target deleted"}

@router.post("/upload-excel/preview")
async def target_excel_preview(
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
        field = _normalize_header(h, TARGET_COLUMN_SYNONYMS)
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
        result = await db.execute(select(Target.title))
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
async def target_excel_import(
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
    valid_fields = {"title","target_value","unit","section","fiscal_year","description"}
    title_header = next((k for k,v in mapping_dict.items() if v=="title"), None)
    existing_names = set()
    if conflict == "skip" and title_header:
        result = await db.execute(select(Target.title))
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
        tname = row_data.get("title", f"Imported-{r}")
        if tname in existing_names:
            skipped += 1
            continue
        t = Target(
            title=tname,
            target_value=try_float_target(row_data.get("target_value"), 0),
            unit=row_data.get("unit", "SKM"),
            section=row_data.get("section"),
            fiscal_year=row_data.get("fiscal_year"),
            description=row_data.get("description"),
            created_by=user.id,
        )
        db.add(t)
        imported += 1
    await db.commit()
    wb.close()
    return {"imported": imported, "skipped": skipped, "msg": f"{imported} targets imported, {skipped} duplicates skipped"}

def try_float_target(v, default=None):
    if not v:
        return default
    try:
        return float(v)
    except:
        return default
