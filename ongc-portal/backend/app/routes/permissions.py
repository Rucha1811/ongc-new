from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models.base import User, UserPermission
from app.auth.deps import get_current_user
from app.auth.security import verify_password, hash_password

router = APIRouter()


@router.get("/")
async def list_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    now = datetime.now(timezone.utc)
    result = await db.execute(select(UserPermission))
    perms = result.scalars().all()
    return [
        {
            "id": p.id,
            "user_id": p.user_id,
            "classification": p.classification,
            "granted_by": p.granted_by,
            "granted_at": str(p.granted_at) if p.granted_at else None,
            "expires_at": str(p.expires_at) if p.expires_at else None,
            "is_expired": p.expires_at is not None and p.expires_at < now,
        }
        for p in perms
    ]


@router.post("/toggle")
async def toggle_permission(
    user_id: int = Body(...),
    classification: str = Body(...),
    grant: bool = Body(...),
    admin_password: str = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")

    if not verify_password(admin_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect admin password")

    if grant:
        res = await db.execute(
            select(UserPermission).where(
                UserPermission.user_id == user_id,
                UserPermission.classification == classification,
            )
        )
        existing = res.scalar_one_or_none()
        if not existing:
            perm = UserPermission(
                user_id=user_id,
                classification=classification,
                granted_by=current_user.id,
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            )
            db.add(perm)
            await db.commit()
            return {"granted": True, "classification": classification, "user_id": user_id, "expires_in_hours": 1}
        return {"granted": True, "classification": classification, "user_id": user_id, "exists": True}
    else:
        res = await db.execute(
            select(UserPermission).where(
                UserPermission.user_id == user_id,
                UserPermission.classification == classification,
            )
        )
        existing = res.scalar_one_or_none()
        if existing:
            await db.delete(existing)
            await db.commit()
        return {"granted": False, "classification": classification, "user_id": user_id}
