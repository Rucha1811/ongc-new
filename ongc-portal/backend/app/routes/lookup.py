from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete as sa_delete
from app.database import get_db
from app.models.base import Lookup, User
from app.auth.deps import get_current_user

router = APIRouter()

@router.get("/{lookup_type}")
async def get_lookups(
    lookup_type: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Lookup)
        .where(Lookup.type == lookup_type, Lookup.is_active == True)
        .order_by(Lookup.sort_order, Lookup.value)
    )
    return [{"id": r.id, "value": r.value} for r in result.scalars().all()]


@router.get("/{lookup_type}/all")
async def get_all_lookups(
    lookup_type: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    result = await db.execute(
        select(Lookup)
        .where(Lookup.type == lookup_type)
        .order_by(Lookup.sort_order, Lookup.value)
    )
    return [{"id": r.id, "value": r.value, "sort_order": r.sort_order, "is_active": r.is_active} for r in result.scalars().all()]


@router.post("/{lookup_type}")
async def add_lookup(
    lookup_type: str,
    value: str = Body(...),
    sort_order: int = Body(0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    lookup = Lookup(type=lookup_type, value=value, sort_order=sort_order)
    db.add(lookup)
    await db.commit()
    await db.refresh(lookup)
    return {"id": lookup.id, "value": lookup.value, "type": lookup.type}


@router.put("/{lookup_type}/{lookup_id}")
async def update_lookup(
    lookup_type: str,
    lookup_id: int,
    value: str = Body(None),
    sort_order: int = Body(None),
    is_active: bool = Body(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    result = await db.execute(select(Lookup).where(Lookup.id == lookup_id, Lookup.type == lookup_type))
    lookup = result.scalar_one_or_none()
    if not lookup:
        raise HTTPException(status_code=404, detail="Lookup not found")
    if value is not None:
        lookup.value = value
    if sort_order is not None:
        lookup.sort_order = sort_order
    if is_active is not None:
        lookup.is_active = is_active
    await db.commit()
    return {"id": lookup.id, "value": lookup.value, "is_active": lookup.is_active}


@router.delete("/{lookup_type}/{lookup_id}")
async def delete_lookup(
    lookup_type: str,
    lookup_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    await db.execute(sa_delete(Lookup).where(Lookup.id == lookup_id, Lookup.type == lookup_type))
    await db.commit()
    return {"deleted": True}
