from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from app.database import get_db
from app.models.base import ManpowerStatus, User
from app.auth.deps import get_current_user
from datetime import date as date_type
import json, openpyxl, re
from io import BytesIO

router = APIRouter()

COLUMN_SYNONYMS = {'category': ['category', 'section', 'department', 'team', 'type'], 'total': ['total', 'headcount', 'strength', 'count'], 'deployed': ['deployed', 'field', 'active', 'on duty'], 'on_leave': ['on leave', 'leave', 'absent', 'on_leave'], 'training': ['training', 'under training', 'trainee']}

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
    q = select(ManpowerStatus).order_by(ManpowerStatus.created_at.desc())
    if role_name == "admin":
        return q
    if role_name == "ops_manager":
        mu = await db.execute(select(User.id).where(User.ops_manager_id == user.id))
        managed_ids = {user.id} | {row[0] for row in mu}
        q = q.where(ManpowerStatus.created_by.in_(managed_ids))
        return q
    q = q.where(ManpowerStatus.created_by == user.id)
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
    return [{"id": x.id,             "category": x.category,             "total": x.total,             "deployed": x.deployed,             "on_leave": x.on_leave,             "training": x.training} for x in items]

@router.post("/create", status_code=201)
async def create_item(
        category: str = Form(...),
    total: int = Form(...),
    deployed: int = Form(...),
    on_leave: int = Form(...),
    training: int = Form(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    obj = ManpowerStatus(
                category=category,
        total=total,
        deployed=deployed,
        on_leave=on_leave,
        training=training,
        created_by=user.id,
    )
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return {"id": obj.id, "msg": "manpower status created"}

@router.put("/{item_id}")
async def update_item(
    item_id: int,
        category: str = Form(None),
    total: int = Form(None),
    deployed: int = Form(None),
    on_leave: int = Form(None),
    training: int = Form(None),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name not in ("admin", "ops_manager", "data_creator"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    result = await db.execute(select(ManpowerStatus).where(ManpowerStatus.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "manpower status not found")
    if category is not None:
        obj.category = category
    if total is not None:
        obj.total = total
    if deployed is not None:
        obj.deployed = deployed
    if on_leave is not None:
        obj.on_leave = on_leave
    if training is not None:
        obj.training = training
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
    result = await db.execute(select(ManpowerStatus).where(ManpowerStatus.id == item_id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "manpower status not found")
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
    title_header = next((k for k,v in auto_mapping.items() if v=="category"), None)
    existing = set()
    dup_rows = 0
    if title_header and title_header in headers:
        result = await db.execute(select(ManpowerStatus.category))
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
    valid_fields = {"category","deployed","on_leave","total","training"}
    title_header = next((k for k,v in mapping_dict.items() if v=="category"), None)
    existing_names = set()
    if conflict == "skip" and title_header:
        result = await db.execute(select(ManpowerStatus.category))
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
        item_name = row_data.get("category", f"Imported-{r}")
        if item_name in existing_names:
            skipped += 1
            continue
        obj = ManpowerStatus(
                        category=row_data.get("category"),
            total=row_data.get("total"),
            deployed=row_data.get("deployed"),
            on_leave=row_data.get("on_leave"),
            training=row_data.get("training"),
            created_by=user.id,
        )
        db.add(obj)
        imported += 1
    await db.commit()
    wb.close()
    return {"imported": imported, "skipped": skipped, "msg": f"{imported} records imported, {skipped} duplicates skipped"}
