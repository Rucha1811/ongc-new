from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from app.database import get_db
from app.models.base import DataProcessingItem, User
from app.auth.deps import get_current_user
from datetime import date as date_type
import json, openpyxl, re
from io import BytesIO

router = APIRouter()

COLUMN_SYNONYMS = {'section': ['section', 'tab', 'category', 'group', 'processing group'], 'project': ['project', 'project name', 'survey', 'campaign'], 'volume': ['volume', 'area', 'quantity', 'size'], 'unit': ['unit', 'uom', 'measurement'], 'progress': ['progress', '%', 'completion %', 'percent'], 'status': ['status', 'current status', 'stage'], 'due_date': ['due date', 'due_date', 'deadline', 'target date']}

def _norm_hdr(s):
    s = s.strip().lower()
    s = re.sub(r'\s+', ' ', s)
    for field, syns in COLUMN_SYNONYMS.items():
        for syn in syns:
            if s == syn or s.startswith(syn) or syn.startswith(s):
                return field
    return None

async def _scope_query(db, user, section=None):
    role_name = user.role.name if user.role else "viewer"
    q = select(DataProcessingItem).order_by(DataProcessingItem.created_at.desc())
    if role_name == "admin":
        if section:
            q = q.where(DataProcessingItem.section == section)
        return q
    if role_name == "ops_manager":
        mu = await db.execute(select(User.id).where(User.ops_manager_id == user.id))
        managed_ids = {user.id} | {row[0] for row in mu}
        ms = set()
        if user.area: ms.add(user.area)
        if user.section: ms.add(user.section)
        if ms:
            q = q.where(or_(DataProcessingItem.section.in_(ms), DataProcessingItem.created_by.in_(managed_ids)))
        else:
            q = q.where(DataProcessingItem.created_by.in_(managed_ids))
        return q
    sec = section or user.section or user.area
    if sec:
        q = q.where(DataProcessingItem.section == sec)
    else:
        q = q.where(DataProcessingItem.created_by == user.id)
    return q

@router.get("/")
async def list_items(
    section: str = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = await _scope_query(db, user, section)
    result = await db.execute(q)
    items = result.scalars().all()
    return [{"id": x.id,             "section": x.section,             "project": x.project,             "volume": x.volume,             "unit": x.unit,             "progress": x.progress,             "status": x.status,             "due_date": str(x.due_date) if x.due_date else None} for x in items]

@router.post("/create", status_code=201)
async def create_item(
        section: str = Form(None),
    project: str = Form(None),
    volume: float = Form(...),
    unit: str = Form(None),
    progress: int = Form(...),
    status: str = Form(None),
    due_date: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    obj = DataProcessingItem(
                section=section,
        project=project,
        volume=volume,
        unit=unit,
        progress=progress,
        status=status,
        due_date=date_type.fromisoformat(due_date) if due_date else None,
        created_by=user.id,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"id": obj.id, "msg": "data processing created"}

@router.put("/{item_id}")
async def update_item(
    item_id: int,
        section: str = Form(None),
    project: str = Form(None),
    volume: float = Form(None),
    unit: str = Form(None),
    progress: int = Form(None),
    status: str = Form(None),
    due_date: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    result = await db.execute(select(DataProcessingItem).where(DataProcessingItem.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "data processing not found")
    if section is not None:
        obj.section = section
    if project is not None:
        obj.project = project
    if volume is not None:
        obj.volume = volume
    if unit is not None:
        obj.unit = unit
    if progress is not None:
        obj.progress = progress
    if status is not None:
        obj.status = status
    if due_date is not None:
        obj.due_date = date_type.fromisoformat(due_date)
    await db.commit()
    return {"success": True}

@router.delete("/{item_id}")
async def delete_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    result = await db.execute(select(DataProcessingItem).where(DataProcessingItem.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "data processing not found")
    await db.delete(obj)
    await db.commit()
    return {"success": True}

@router.post("/upload-excel/preview")
async def excel_preview(
    file: UploadFile = File(...),
    sheet_name: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(403, "Not enough permissions")
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
        field = _norm_hdr(h)
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
    title_header = next((k for k,v in auto_mapping.items() if v=="section"), None)
    existing = set()
    dup_rows = 0
    if title_header and title_header in headers:
        result = await db.execute(select(DataProcessingItem.section))
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
async def excel_import(
    file: UploadFile = File(...),
    mapping: str = Form(...),
    sheet_name: str = Form(None),
    conflict: str = Form("skip"),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(403, "Not enough permissions")
    mapping_dict = json.loads(mapping)
    contents = await file.read()
    wb = openpyxl.load_workbook(BytesIO(contents), data_only=True)
    if sheet_name and sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
    else:
        ws = wb.active
    headers = [c.value for c in ws[1] if c.value]
    col_idx = {h: i for i, h in enumerate(headers)}
    valid_fields = {"due_date","progress","project","section","status","unit","volume"}
    title_header = next((k for k,v in mapping_dict.items() if v=="section"), None)
    existing_names = set()
    if conflict == "skip" and title_header:
        result = await db.execute(select(DataProcessingItem.section))
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
                    has_data = True
        if not has_data:
            continue
        item_name = row_data.get("section", f"Imported-{r}")
        if item_name in existing_names:
            skipped += 1
            continue
        obj = DataProcessingItem(
                        section=row_data.get("section"),
            project=row_data.get("project"),
            volume=row_data.get("volume"),
            unit=row_data.get("unit"),
            progress=row_data.get("progress"),
            status=row_data.get("status"),
            due_date=row_data.get("due_date"),
            created_by=user.id,
        )
        db.add(obj)
        imported += 1
    await db.commit()
    wb.close()
    return {"imported": imported, "skipped": skipped, "msg": f"{imported} records imported, {skipped} duplicates skipped"}
