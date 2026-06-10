from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.base import User
from app.auth.security import verify_password, create_access_token
from app.activity_utils import log_activity
from datetime import timedelta

router = APIRouter()

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.cpf == form_data.username).options(selectinload(User.role))
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect CPF or password")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    role_name = user.role.name if user.role else "viewer"
    access_token = create_access_token(
        data={"sub": str(user.id), "role": role_name},
        expires_delta=timedelta(minutes=60)
    )
    await log_activity(db, user.id, "login", "user", user.id, f"User {user.name} logged in")
    await db.commit()
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "cpf": user.cpf,
            "name": user.name,
            "designation": user.designation,
            "section": user.section,
            "level": user.level,
            "is_active": user.is_active,
            "role": role_name,
            "role_name": role_name,
        }
    }
