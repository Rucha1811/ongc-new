from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models.base import Highlight, User
from app.auth.deps import get_current_user
from datetime import datetime
import json, openpyxl, re
from io import BytesIO

router = APIRouter()

@router.get("/")
async def list_highlights(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Highlight).order_by(Highlight.created_at.desc())
    )
    items = result.scalars().all()
    return [
        {
            "id": h.id,
            "title": h.title,
            "description": h.description,
            "author": h.author or (h.creator.name if h.creator else ""),
            "icon": h.icon or "🏆",
            "created_by": h.created_by,
            "created_at": h.created_at.isoformat() if h.created_at else None,
        }
        for h in items
    ]


@router.post("/create")
async def create_highlight(
    title: str,
    description: str,
    author: str = None,
    icon: str = "🏆",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = current_user.role.name if current_user.role else ""
    if role not in ("admin", "ops_manager"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    if not title or not description:
        raise HTTPException(status_code=400, detail="Title and description required")
    hl = Highlight(
        title=title,
        description=description,
        author=author or current_user.name,
        icon=icon,
        created_by=current_user.id,
    )
    db.add(hl)
    await db.commit()
    await db.refresh(hl)
    return {
        "id": hl.id,
        "title": hl.title,
        "description": hl.description,
        "author": hl.author,
        "icon": hl.icon,
        "created_by": hl.created_by,
        "created_at": hl.created_at.isoformat() if hl.created_at else None,
    }


@router.put("/{highlight_id}")
async def update_highlight(
    highlight_id: int,
    title: str = None,
    description: str = None,
    author: str = None,
    icon: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = current_user.role.name if current_user.role else ""
    if role not in ("admin", "ops_manager"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    result = await db.execute(select(Highlight).where(Highlight.id == highlight_id))
    hl = result.scalar_one_or_none()
    if not hl:
        raise HTTPException(status_code=404, detail="Highlight not found")
    if title:
        hl.title = title
    if description:
        hl.description = description
    if author:
        hl.author = author
    if icon:
        hl.icon = icon
    hl.updated_at = datetime.utcnow()
    await db.commit()
    return {"success": True, "highlight_id": highlight_id}


@router.delete("/{highlight_id}")
async def delete_highlight(
    highlight_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = current_user.role.name if current_user.role else ""
    if role not in ("admin", "ops_manager"):
        raise HTTPException(status_code=403, detail="Not enough permissions")
    result = await db.execute(select(Highlight).where(Highlight.id == highlight_id))
    hl = result.scalar_one_or_none()
    if not hl:
        raise HTTPException(status_code=404, detail="Highlight not found")
    await db.delete(hl)
    await db.commit()
    return {"success": True, "highlight_id": highlight_id}

HIGHLIGHT_COLUMN_SYNONYMS = {
    "title": ["title", "heading", "name", "highlight"],
    "description": ["description", "desc", "details", "text", "notes", "remarks"],
    "author": ["author", "creator", "reported by", "name", "person"],
    "icon": ["icon", "emoji", "symbol"],
}

def _norm_hdr(s, syn_map):
    s = s.strip().lower()
    s = re.sub(r'\s+', ' ', s)
    for field, synonyms in syn_map.items():
        for syn in synonyms:
            if s == syn or s.startswith(syn) or syn.startswith(s):
                return field
    return None

@router.post("/upload-excel/preview")
async def highlight_excel_preview(
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
        field = _norm_hdr(h, HIGHLIGHT_COLUMN_SYNONYMS)
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
        result = await db.execute(select(Highlight.title))
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
async def highlight_excel_import(
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
    valid_fields = {"title","description","author","icon"}
    title_header = next((k for k,v in mapping_dict.items() if v=="title"), None)
    existing_names = set()
    if conflict == "skip" and title_header:
        result = await db.execute(select(Highlight.title))
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
        hname = row_data.get("title", f"Imported-{r}")
        if hname in existing_names:
            skipped += 1
            continue
        hl = Highlight(
            title=hname,
            description=row_data.get("description", ""),
            author=row_data.get("author"),
            icon=row_data.get("icon", "🏆"),
            created_by=user.id,
        )
        db.add(hl)
        imported += 1
    await db.commit()
    wb.close()
    return {"imported": imported, "skipped": skipped, "msg": f"{imported} highlights imported, {skipped} duplicates skipped"}
