import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.base import KnowledgeItem, User, Notification
from app.auth.deps import get_current_user
from datetime import datetime
from app.config import settings

router = APIRouter()
KNOWLEDGE_DIR = os.path.join(settings.UPLOAD_DIR, "knowledge")
os.makedirs(KNOWLEDGE_DIR, exist_ok=True)

@router.get("/")
async def list_knowledge(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name == "admin":
        q = select(KnowledgeItem).order_by(KnowledgeItem.created_at.desc())
    elif role_name == "ops_manager":
        q = select(KnowledgeItem).order_by(KnowledgeItem.created_at.desc())
    else:
        q = select(KnowledgeItem).where(
            (KnowledgeItem.user_id == user.id) | (KnowledgeItem.status == "approved")
        ).order_by(KnowledgeItem.created_at.desc())
    result = await db.execute(q)
    items = result.scalars().all()
    return [
        {
            "id": k.id,
            "user_id": k.user_id,
            "title": k.title,
            "description": k.description,
            "file_name": k.file_name,
            "category": k.category,
            "status": k.status,
            "reviewed_by_ops": k.reviewed_by_ops,
            "reviewed_by_admin": k.reviewed_by_admin,
            "ops_comment": k.ops_comment,
            "admin_comment": k.admin_comment,
            "created_at": k.created_at.isoformat() if k.created_at else None,
            "updated_at": k.updated_at.isoformat() if k.updated_at else None,
        }
        for k in items
    ]

@router.post("/create", status_code=201)
async def create_knowledge(
    title: str = Form(...),
    description: str = Form(None),
    category: str = Form(None),
    file: UploadFile = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_path = None
    file_name = None
    if file and file.filename:
        file_name = file.filename
        safe_name = f"{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{file.filename.replace(' ', '_')}"
        file_path = os.path.join(KNOWLEDGE_DIR, safe_name)
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

    item = KnowledgeItem(
        title=title,
        description=description,
        category=category,
        file_path=file_path,
        file_name=file_name,
        user_id=current_user.id,
        status="pending",
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)

    admins = await db.execute(select(User.id).where(User.role.has(name="admin")))
    for a in admins:
        db.add(Notification(user_id=a[0], message=f'New knowledge share: "{title}" from {current_user.name}', is_read=False))
    await db.commit()

    return {"id": item.id, "title": item.title, "status": item.status, "msg": "Knowledge item submitted"}

@router.post("/{item_id}/approve-ops")
async def approve_ops(
    item_id: int,
    comment: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role_name = current_user.role.name if current_user.role else ""
    if role_name not in ("admin", "ops_manager"):
        raise HTTPException(403, "Only ops_manager/admin can approve")
    result = await db.execute(select(KnowledgeItem).where(KnowledgeItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Not found")
    if item.status != "pending":
        raise HTTPException(400, f"Already {item.status}")
    item.status = "ops_approved"
    item.reviewed_by_ops = current_user.id
    item.ops_comment = comment
    item.updated_at = datetime.utcnow()
    await db.commit()
    admins = await db.execute(select(User.id).where(User.role.has(name="admin")))
    for a in admins:
        db.add(Notification(user_id=a[0], message=f'Knowledge "{item.title}" approved by ops_manager {current_user.name}', is_read=False))
    db.add(Notification(user_id=item.user_id, message=f'Your shared knowledge "{item.title}" approved by ops_manager. Awaiting admin.', is_read=False))
    await db.commit()
    return {"msg": "Approved at ops level", "status": item.status}

@router.post("/{item_id}/approve-admin")
async def approve_admin(
    item_id: int,
    comment: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role_name = current_user.role.name if current_user.role else ""
    if role_name != "admin":
        raise HTTPException(403, "Only admin can final-approve")
    result = await db.execute(select(KnowledgeItem).where(KnowledgeItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Not found")
    if item.status not in ("pending", "ops_approved"):
        raise HTTPException(400, f"Already {item.status}")
    item.status = "approved"
    item.reviewed_by_admin = current_user.id
    item.admin_comment = comment
    item.updated_at = datetime.utcnow()
    await db.commit()
    db.add(Notification(user_id=item.user_id, message=f'Your shared knowledge "{item.title}" approved by admin!', is_read=False))
    if item.reviewed_by_ops:
        db.add(Notification(user_id=item.reviewed_by_ops, message=f'Knowledge "{item.title}" approved by admin.', is_read=False))
    await db.commit()
    return {"msg": "Fully approved", "status": item.status}

@router.post("/{item_id}/reject")
async def reject_knowledge(
    item_id: int,
    comment: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role_name = current_user.role.name if current_user.role else ""
    if role_name not in ("admin", "ops_manager"):
        raise HTTPException(403, "Only ops_manager/admin can reject")
    result = await db.execute(select(KnowledgeItem).where(KnowledgeItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Not found")
    if item.status in ("approved", "rejected"):
        raise HTTPException(400, f"Already {item.status}")
    item.status = "rejected"
    item.updated_at = datetime.utcnow()
    if role_name == "ops_manager":
        item.ops_comment = comment
        item.reviewed_by_ops = current_user.id
    else:
        item.admin_comment = comment
        item.reviewed_by_admin = current_user.id
    await db.commit()
    db.add(Notification(user_id=item.user_id, message=f'Your knowledge "{item.title}" was rejected by {current_user.name}. Reason: {comment}', is_read=False))
    await db.commit()
    return {"msg": "Rejected", "status": item.status}

@router.get("/download/{item_id}")
async def download_knowledge(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(KnowledgeItem).where(KnowledgeItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Not found")
    if item.status != "approved" and item.user_id != user.id and (user.role.name or "") not in ("admin", "ops_manager"):
        raise HTTPException(403, "Not approved yet")
    if not item.file_path or not os.path.exists(item.file_path):
        raise HTTPException(404, "File not found on disk")
    from fastapi.responses import FileResponse
    return FileResponse(item.file_path, filename=item.file_name)
