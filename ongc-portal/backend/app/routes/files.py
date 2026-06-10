from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, and_
from app.database import get_db
from app.models.base import File, User, UserPermission
from app.auth.deps import get_current_user
from app.activity_utils import log_activity
import os
from app.config import settings
from datetime import datetime, timezone, timedelta
from mimetypes import guess_type

router = APIRouter()
RESTRICTED_CLASSIFICATIONS = {"Confidential", "Highly Confidential / Restricted"}

def get_accessible_classifications(role_name: str, permissions: list) -> set:
    """Return set of classification a user is allowed to see based on role + granted permissions."""
    now = datetime.now(timezone.utc)
    # Everyone can always see General
    accessible = {"General / Available for All"}
    if role_name == "admin":
        return {"General / Available for All", "Sensitive / Internal Use", "Confidential", "Highly Confidential / Restricted"}
    if role_name == "ops_manager":
        accessible.add("Sensitive / Internal Use")
    # Add any non-expired granted permissions
    for p in permissions:
        if p.expires_at and p.expires_at < now:
            continue
        accessible.add(p.classification)
    return accessible

def sanitize_folder_name(name: str) -> str:
    """Replace non-alphanumeric chars with _ for filesystem-safe folder names."""
    if not name:
        return "Uncategorized"
    safe = name.replace("/", "_").replace(" ", "_")
    while "__" in safe:
        safe = safe.replace("__", "_")
    return safe.strip("_")

ALL_CLASSIFICATIONS = [
    "General_Available_for_All",
    "Sensitive_Internal_Use",
    "Confidential",
    "Highly_Confidential_Restricted",
]

def build_file_path(upload_dir: str, category: str, classification: str, filename: str) -> str:
    """Build nested path: uploads/{category}/{classification}/{filename}
    Pre-creates all 4 classification subfolders under the category folder."""
    cat_dir = sanitize_folder_name(category)
    cls_dir = sanitize_folder_name(classification) if classification else "Unclassified"
    # Pre-create all classification folders under this category
    for cls in ALL_CLASSIFICATIONS + ["Unclassified"]:
        os.makedirs(os.path.join(upload_dir, cat_dir, cls), exist_ok=True)
    return os.path.join(upload_dir, cat_dir, cls_dir, filename)

def _is_seed_data(f: File) -> bool:
    return f.file_path and "seed_" in f.file_path

def _can_download_file(f: File) -> bool:
    if _is_seed_data(f):
        return False
    return f.status == "Approved" and f.classification not in RESTRICTED_CLASSIFICATIONS

def _can_view_file(f: File) -> bool:
    if _is_seed_data(f):
        return False
    return f.status == "Approved"

def _response_headers(file_name: str, disposition: str) -> dict:
    return {"Content-Disposition": f'{disposition}; filename="{file_name}"'}

def _media_type_for(file_name: str) -> str:
    media_type, _ = guess_type(file_name)
    return media_type or "application/octet-stream"

def file_to_dict(f: File) -> dict:
    return {
        "id": f.id,
        "file_name": f.file_name,
        "file_type": f.file_type,
        "project_name": f.project_name,
        "sig_number": f.sig_number,
        "data_type": f.data_type,
        "section": f.section,
        "category": f.category,
        "season": f.season,
        "block": f.block,
        "ml_block": f.ml_block,
        "location": f.location,
        "classification": f.classification,
        "status": f.status,
        "uploaded_by": f.uploaded_by,
        "uploaded_by_name": f.uploader.name if f.uploader else str(f.uploaded_by),
        "upload_date": f.upload_date.isoformat() if f.upload_date else None,
        "file_size": f.file_size,
        "file_path": f.file_path,
        "created_at": f.created_at.isoformat() if f.created_at else None,
        "updated_at": f.updated_at.isoformat() if f.updated_at else None,
    }

@router.post("/upload")
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    file_name: str = Form(...),
    file_type: str = Form(...),
    project_name: str = Form(None),
    sig_number: str = Form(None),
    data_type: str = Form(None),
    section: str = Form(None),
    category: str = Form(None),
    season: str = Form(None),
    block: str = Form(None),
    ml_block: str = Form(None),
    location: str = Form(None),
    classification: str = Form(None),
    file_size: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    allowed_ext = {"pdf","docx","xlsx","ppt","pptx","txt","dat","csv","zip"}
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in allowed_ext:
        raise HTTPException(status_code=400, detail=f"File type '.{ext}' not allowed")

    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)

    contents = await file.read()
    orig_filename = file.filename.replace(" ", "_")
    file_path = build_file_path(upload_dir, category, classification, orig_filename)
    with open(file_path, "wb") as fh:
        fh.write(contents)

    db_file = File(
        file_name=file_name or orig_filename,
        file_type=file_type.upper(),
        project_name=project_name,
        sig_number=sig_number,
        data_type=data_type,
        section=section,
        category=category,
        season=season,
        block=block,
        ml_block=ml_block,
        location=location,
        classification=classification,
        status="Pending",
        uploaded_by=current_user.id,
        upload_date=datetime.utcnow(),
        file_size=file_size or f"{len(contents)/1024/1024:.2f} MB",
        file_path=file_path,
        file_data=contents,
    )
    db.add(db_file)
    await db.commit()
    await db.refresh(db_file)

    await log_activity(db, current_user.id, "upload", "file", db_file.id, f"Uploaded '{file_name}' ({classification})")
    await db.commit()

    # Load uploader for response
    result = await db.execute(
        select(File).where(File.id == db_file.id).options(selectinload(File.uploader))
    )
    db_file = result.scalar_one()
    return file_to_dict(db_file)


@router.get("/")
async def list_files(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get user's permissions
    perm_res = await db.execute(
        select(UserPermission).where(UserPermission.user_id == current_user.id)
    )
    user_perms = perm_res.scalars().all()
    accessible = get_accessible_classifications(current_user.role.name, user_perms)

    result = await db.execute(
        select(File).options(selectinload(File.uploader))
    )
    all_files = result.scalars().all()

    if current_user.role.name == "admin":
        return [file_to_dict(f) for f in all_files]

    return [
        file_to_dict(f) for f in all_files
        if f.uploaded_by == current_user.id
        or (f.classification and f.classification in accessible)
    ]


@router.get("/download/{file_id}")
async def download_file(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(File).where(File.id == file_id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    if not _can_download_file(f):
        raise HTTPException(status_code=403, detail="This file is view-only. Download is not allowed for this classification.")
    if f.file_data:
        from fastapi.responses import Response
        return Response(
            content=f.file_data,
            media_type=_media_type_for(f.file_name),
            headers=_response_headers(f.file_name, "attachment"),
        )
    if not f.file_path or not os.path.exists(f.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path=f.file_path,
        filename=f.file_name,
        media_type=_media_type_for(f.file_name),
        headers=_response_headers(f.file_name, "attachment"),
    )


@router.get("/view/{file_id}")
async def view_file(
    file_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(File).where(File.id == file_id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    if not _can_view_file(f):
        raise HTTPException(status_code=403, detail="Only approved files can be viewed")
    disp = "inline" if f.classification in RESTRICTED_CLASSIFICATIONS else "inline"
    if f.file_data:
        from fastapi.responses import Response
        return Response(
            content=f.file_data,
            media_type=_media_type_for(f.file_name),
            headers=_response_headers(f.file_name, disp),
        )
    if not f.file_path or not os.path.exists(f.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path=f.file_path,
        filename=f.file_name,
        media_type=_media_type_for(f.file_name),
        headers=_response_headers(f.file_name, disp),
    )


@router.get("/search")
async def search_files(
    search: str = None,
    status: str = None,
    section: str = None,
    file_type: str = None,
    data_type: str = None,
    season: str = None,
    block: str = None,
    classification: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get user's granted permissions
    perm_res = await db.execute(
        select(UserPermission).where(UserPermission.user_id == current_user.id)
    )
    user_perms = perm_res.scalars().all()
    accessible = get_accessible_classifications(current_user.role.name, user_perms)

    query = select(File).options(selectinload(File.uploader))
    filters = []

    if search:
        s = f"%{search.lower()}%"
        filters.append(or_(
            File.file_name.ilike(s),
            File.project_name.ilike(s),
            File.sig_number.ilike(s),
            File.category.ilike(s),
            File.location.ilike(s),
        ))
    if status:
        filters.append(File.status == status)
    if section:
        filters.append(File.section == section)
    if file_type:
        filters.append(File.file_type.ilike(file_type))
    if data_type:
        filters.append(File.data_type == data_type)
    if season:
        filters.append(File.season == season)
    if block:
        filters.append(File.block == block)
    if classification:
        filters.append(File.classification == classification)

    if filters:
        query = query.where(and_(*filters))

    result = await db.execute(query)
    all_files = result.scalars().all()

    # Admin sees everything; others filtered by role + permissions
    if current_user.role.name == "admin":
        return [file_to_dict(f) for f in all_files]

    return [
        file_to_dict(f) for f in all_files
        if f.uploaded_by == current_user.id
        or (f.classification and f.classification in accessible)
    ]
