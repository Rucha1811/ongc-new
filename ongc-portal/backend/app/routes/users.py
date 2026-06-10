from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.base import User, Role
from app.auth.deps import get_current_user
from app.auth.security import hash_password

router = APIRouter()


@router.get("/")
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(User).options(selectinload(User.role))
    )
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "cpf": u.cpf,
            "name": u.name,
            "designation": u.designation,
            "section": u.section,
            "level": u.level,
            "is_active": u.is_active,
            "role": u.role.name if u.role else "viewer",
            "role_name": u.role.name if u.role else "viewer",
        }
        for u in users
    ]


@router.post("/create")
async def create_user(
    cpf: str = Body(...),
    password: str = Body(...),
    name: str = Body(None),
    designation: str = Body(None),
    section: str = Body(None),
    role_name: str = Body("viewer"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Only admins can create new users
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create users")

    # Check existing
    res = await db.execute(select(User).where(User.cpf == cpf))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="CPF already exists")

    ROLE_MAP = {"admin":1, "ops_manager":2, "data_creator":3, "viewer":4}
    role_id = ROLE_MAP.get(role_name, 4)

    # Ensure role row exists
    res = await db.execute(select(Role).where(Role.id == role_id))
    role = res.scalar_one_or_none()
    if not role:
        role = Role(id=role_id, name=role_name, description=f"Role {role_name}")
        db.add(role)
        await db.commit()
        await db.refresh(role)

    user = User(
        cpf=cpf,
        password_hash=hash_password(password),
        name=name or f"Employee {cpf}",
        designation=designation,
        section=section,
        level=0,
        is_active=True,
        role_id=role_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {
        "id": user.id,
        "cpf": user.cpf,
        "name": user.name,
        "role": role.name,
    }


@router.put("/{user_id}/role")
async def update_user_role(
    user_id: int,
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins can change roles")

    res = await db.execute(select(User).options(selectinload(User.role)).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role and user.role.name == "admin":
        raise HTTPException(status_code=403, detail="Admin user's role cannot be changed")

    role_name = payload.get("role_name", "viewer")

    ROLE_MAP = {"admin":1, "ops_manager":2, "data_creator":3, "viewer":4}
    role_id = ROLE_MAP.get(role_name, 4)

    res = await db.execute(select(Role).where(Role.id == role_id))
    role = res.scalar_one_or_none()
    if not role:
        role = Role(id=role_id, name=role_name, description=f"Role {role_name}")
        db.add(role)
        await db.commit()
        await db.refresh(role)

    user.role_id = role_id
    await db.commit()
    await db.refresh(user)

    return {"id": user.id, "cpf": user.cpf, "name": user.name, "role": role.name}
