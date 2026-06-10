import os
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models.base import File, Approval, User, Notification
from app.auth.deps import get_current_user
from app.activity_utils import log_activity
from datetime import datetime

router = APIRouter()

@router.post("/approve/{file_id}")
async def approve_file(
    file_id: int,
    classification: str = None,
    comment: str = "Approved",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_name = current_user.role.name if current_user.role else ""
    if role_name not in ["admin", "ops_manager"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    result = await db.execute(select(File).where(File.id == file_id))
    file = result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    file.status = "Approved"
    if classification:
        file.classification = classification
    approval = Approval(
        file_id=file.id,
        action="approved",
        action_by=current_user.id,
        action_at=datetime.utcnow(),
        comment=comment,
    )
    db.add(approval)

    notif = Notification(
        user_id=file.uploaded_by,
        message=f'Your file "{file.file_name}" has been approved by {current_user.name}.',
        is_read=False,
    )
    db.add(notif)
    await log_activity(db, current_user.id, "approve", "file", file_id, f"Approved '{file.file_name}'" + (f" as {classification}" if classification else ""))
    await db.commit()

    return {"success": True, "file_id": file_id, "status": "Approved", "classification": file.classification}


@router.post("/reject/{file_id}")
async def reject_file(
    file_id: int,
    comment: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_name = current_user.role.name if current_user.role else ""
    if role_name not in ["admin", "ops_manager"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")

    if not comment or not comment.strip():
        raise HTTPException(status_code=400, detail="Rejection reason is required")

    result = await db.execute(select(File).where(File.id == file_id))
    file = result.scalar_one_or_none()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    file.status = "Rejected"
    approval = Approval(
        file_id=file.id,
        action="rejected",
        action_by=current_user.id,
        action_at=datetime.utcnow(),
        comment=comment.strip(),
    )
    db.add(approval)

    # Notify uploader
    notif = Notification(
        user_id=file.uploaded_by,
        message=f'Your file "{file.file_name}" was rejected by {current_user.name}. Reason: {comment.strip()}',
        is_read=False,
    )
    db.add(notif)
    await log_activity(db, current_user.id, "reject", "file", file_id, f"Rejected '{file.file_name}'. Reason: {comment.strip()}")
    await db.commit()
    return {"success": True, "file_id": file_id, "status": "Rejected", "comment": comment.strip()}
