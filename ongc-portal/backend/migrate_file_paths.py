"""Migrate existing file_path values to new project/section/classification folder structure.
Run: python3 migrate_file_paths.py  (from backend/ directory)
"""
import asyncio
import os
import shutil
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from app.config import settings

DATABASE_URL = (
    f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
    f"@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
)

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

def sanitize(name: str) -> str:
    if not name:
        return ""
    safe = name.replace("/", "_").replace(" ", "_")
    while "__" in safe:
        safe = safe.replace("__", "_")
    return safe.strip("_")

async def migrate():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT id, file_name, project_name, section, classification, file_path, file_data FROM files"))
        rows = result.fetchall()
        upload_dir = settings.UPLOAD_DIR
        print(f"Migrating {len(rows)} files...")

        for r in rows:
            fid, fname, proj, sec, cls, old_path, fdata = r
            proj_safe = sanitize(proj) or "Uncategorized"
            sec_safe = sanitize(sec) or "General"
            cls_safe = sanitize(cls) or "Unclassified"
            old_basename = os.path.basename(old_path) if old_path else fname
            new_folder = os.path.join(upload_dir, proj_safe, sec_safe, cls_safe)
            new_path = os.path.join(new_folder, old_basename)

            if old_path and old_path == new_path:
                print(f"  ID {fid}: Already correct → {new_path}")
                continue

            if old_path and os.path.exists(old_path):
                os.makedirs(new_folder, exist_ok=True)
                if os.path.normpath(old_path) != os.path.normpath(new_path):
                    shutil.move(old_path, new_path)
                    print(f"  ID {fid}: Moved {old_path} → {new_path}")
                else:
                    print(f"  ID {fid}: Path same, skipping move")
            elif old_path:
                print(f"  ID {fid}: No file on disk at {old_path}, just updating DB path")

            await db.execute(
                text("UPDATE files SET file_path = :path WHERE id = :id"),
                {"path": new_path, "id": fid}
            )
            print(f"  ID {fid}: DB file_path updated → {new_path}")

        await db.commit()
        print("\nMigration complete!")

        print("\nVerifying...")
        vr = await db.execute(text("SELECT id, file_name, project_name, section, classification, file_path FROM files ORDER BY id"))
        for v in vr.fetchall():
            print(f"  ID {v[0]:>3}  {v[1]:<30}  Proj:{v[2] or '':<20}  Sec:{v[3] or '':<15}  Class:{v[4] or '':<30}  Path:{v[5]}")

asyncio.run(migrate())
