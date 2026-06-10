"""
Import HR CSV into the backend database (users + roles).

Usage (from repo root):
  POSTGRES_SERVER=localhost python backend/scripts/import_hr.py /path/to/Cleaned_HR_Data_Analysis.csv

The script maps:
  - Employee ID -> `users.cpf`
  - Title -> `users.designation`
  - DepartmentType/Division -> `users.section`
  - EmployeeStatus -> `users.is_active`
  - EmployeeType -> `roles.name` (created if missing) and assigned to user
  - name -> generated as "Employee {Employee ID}" when not present

Default login password for imported accounts: `Welcome123` (you can change this after import).
"""
import sys
import csv
import uuid
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

from app.config import settings
from app.models.base import Base, Role, User
from app.auth.security import hash_password


def make_database_url():
    server = getattr(settings, "POSTGRES_SERVER", None) or "db"
    # Allow override via environment var when running from host
    import os
    server = os.environ.get("POSTGRES_SERVER", server)
    return (
        f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
        f"@{server}/{settings.POSTGRES_DB}"
    )


async def import_csv(file_path: str):
    DATABASE_URL = make_database_url()
    engine = create_async_engine(DATABASE_URL, echo=False, future=True)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    inserted_users = 0
    inserted_roles = 0
    role_cache = {}

    # Create tables if missing
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        with open(file_path, newline='') as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                cpf = (row.get('Employee ID') or row.get('EmployeeID') or '').strip()
                if not cpf:
                    continue

                # role by EmployeeType
                role_name = (row.get('EmployeeType') or 'employee').strip() or 'employee'
                role = role_cache.get(role_name)
                if not role:
                    res = await db.execute(select(Role).where(Role.name == role_name))
                    role = res.scalar_one_or_none()
                    if not role:
                        role = Role(id=uuid.uuid4(), name=role_name, description=f"Imported role {role_name}")
                        db.add(role)
                        await db.commit()
                        await db.refresh(role)
                        inserted_roles += 1
                    role_cache[role_name] = role

                # check existing user
                res = await db.execute(select(User).where(User.cpf == str(cpf)))
                user = res.scalar_one_or_none()
                if user:
                    continue

                name = row.get('Employee Name') or row.get('Name') or f"Employee {cpf}"
                designation = row.get('Title') or ''
                section = (row.get('DepartmentType') or row.get('Division') or '').strip()
                is_active = (row.get('EmployeeStatus') or '').strip().lower() == 'active'

                new_user = User(
                    id=uuid.uuid4(),
                    cpf=str(cpf),
                    password_hash=hash_password('Welcome123'),
                    name=name,
                    designation=designation,
                    section=section,
                    level=0,
                    is_active=is_active,
                    role_id=role.id,
                )
                db.add(new_user)
                inserted_users += 1
                # commit in batches to avoid huge transactions
                if inserted_users % 250 == 0:
                    await db.commit()

        await db.commit()

    await engine.dispose()
    print(f"Inserted roles: {inserted_roles}")
    print(f"Inserted users: {inserted_users}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python import_hr.py /path/to/file.csv")
        sys.exit(1)
    file_path = sys.argv[1]
    asyncio.run(import_csv(file_path))


if __name__ == '__main__':
    main()
