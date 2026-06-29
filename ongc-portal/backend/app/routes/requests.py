from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.base import Request, User, Notification
from app.auth.deps import get_current_user
from datetime import datetime

router = APIRouter()

@router.get("/")
async def list_requests(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    role_name = user.role.name if user.role else "viewer"
    if role_name == "admin":
        q = select(Request).order_by(Request.created_at.desc())
    elif role_name == "ops_manager":
        q = select(Request).order_by(Request.created_at.desc())
    else:
        q = select(Request).where(Request.user_id == user.id).order_by(Request.created_at.desc())
    result = await db.execute(q)
    items = result.scalars().all()
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "title": r.title,
            "description": r.description,
            "target_type": r.target_type,
            "status": r.status,
            "ops_manager_id": r.ops_manager_id,
            "reviewed_by_ops": r.reviewed_by_ops,
            "reviewed_by_admin": r.reviewed_by_admin,
            "ops_comment": r.ops_comment,
            "admin_comment": r.admin_comment,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in items
    ]

@router.post("/create", status_code=201)
async def create_request(
    title: str = Form(...),
    description: str = Form(None),
    target_type: str = Form("general"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = Request(
        title=title,
        description=description,
        target_type=target_type,
        user_id=current_user.id,
        status="pending",
        ops_manager_id=current_user.ops_manager_id,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)
    
    if current_user.ops_manager_id:
        db.add(Notification(user_id=current_user.ops_manager_id, message=f'New request from {current_user.name}: "{title}"', is_read=False))
    admins = await db.execute(select(User.id).where(User.role.has(name="admin")))
    for a in admins:
        db.add(Notification(user_id=a[0], message=f'New request from {current_user.name}: "{title}"', is_read=False))
    return {"id": req.id, "title": req.title, "status": req.status, "msg": "Request created"}

@router.post("/{request_id}/approve-ops")
async def approve_ops(
    request_id: int,
    comment: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role_name = current_user.role.name if current_user.role else ""
    if role_name not in ("admin", "ops_manager"):
        raise HTTPException(403, "Only ops_manager/admin can approve at this level")
    result = await db.execute(select(Request).where(Request.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.ops_manager_id and req.ops_manager_id != current_user.id and role_name != "admin":
        raise HTTPException(403, "This request is not assigned to you")
    if req.status != "pending":
        raise HTTPException(400, f"Request is already {req.status}")
    req.status = "ops_approved"
    req.reviewed_by_ops = current_user.id
    req.ops_comment = comment
    req.updated_at = datetime.utcnow()
    await db.commit()
    
    admins = await db.execute(select(User.id).where(User.role.has(name="admin")))
    for a in admins:
        db.add(Notification(user_id=a[0], message=f'Request "{req.title}" approved by ops_manager {current_user.name}, needs admin approval', is_read=False))
    db.add(Notification(user_id=req.user_id, message=f'Your request "{req.title}" has been approved by {current_user.name} (Ops Manager). Awaiting admin approval.', is_read=False))
    return {"msg": "Request approved by ops_manager, now pending admin approval", "status": req.status}

@router.post("/{request_id}/approve-admin")
async def approve_admin(
    request_id: int,
    comment: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role_name = current_user.role.name if current_user.role else ""
    if role_name != "admin":
        raise HTTPException(403, "Only admin can approve at this level")
    result = await db.execute(select(Request).where(Request.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.status not in ("pending", "ops_approved"):
        raise HTTPException(400, f"Request is already {req.status}")
    req.status = "approved"
    req.reviewed_by_admin = current_user.id
    req.admin_comment = comment
    req.updated_at = datetime.utcnow()
    await db.commit()
    
    db.add(Notification(user_id=req.user_id, message=f'Your request "{req.title}" has been fully approved by admin {current_user.name}!', is_read=False))
    if req.reviewed_by_ops:
        db.add(Notification(user_id=req.reviewed_by_ops, message=f'Request "{req.title}" has been approved by admin {current_user.name}.', is_read=False))
    return {"msg": "Request fully approved", "status": req.status}

@router.post("/{request_id}/reject")
async def reject_request(
    request_id: int,
    comment: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role_name = current_user.role.name if current_user.role else ""
    if role_name not in ("admin", "ops_manager"):
        raise HTTPException(403, "Only ops_manager/admin can reject requests")
    result = await db.execute(select(Request).where(Request.id == request_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Request not found")
    if req.status in ("approved", "rejected"):
        raise HTTPException(400, f"Request is already {req.status}")
    req.status = "rejected"
    req.updated_at = datetime.utcnow()
    if role_name == "ops_manager":
        req.ops_comment = comment
        req.reviewed_by_ops = current_user.id
    else:
        req.admin_comment = comment
        req.reviewed_by_admin = current_user.id
    await db.commit()
    
    db.add(Notification(user_id=req.user_id, message=f'Your request "{req.title}" was rejected by {current_user.name}. Reason: {comment}', is_read=False))
    return {"msg": "Request rejected", "status": req.status}
