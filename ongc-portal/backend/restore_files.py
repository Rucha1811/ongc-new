"""Restore uploaded files that lost DB records after migration"""
import asyncio
import os
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from sqlalchemy import text

from app.config import settings

def sanitize_folder_name(name: str) -> str:
    if not name:
        return "Uncategorized"
    safe = name.replace("/", "_").replace(" ", "_")
    while "__" in safe:
        safe = safe.replace("__", "_")
    return safe.strip("_")

def build_file_path(upload_dir: str, category: str, classification: str, filename: str) -> str:
    cat_dir = sanitize_folder_name(category) if category else "Uncategorized"
    cls_dir = sanitize_folder_name(classification) if classification else "Unclassified"
    folder = os.path.join(upload_dir, cat_dir, cls_dir)
    os.makedirs(folder, exist_ok=True)
    return os.path.join(folder, filename)

DATABASE_URL = (
    f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
    f"@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
)

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Files on disk that lost their DB records
# Add category and classification so they get proper folder placement
FILES_TO_RESTORE = [
    {"disk_name": "9.pdf", "display_name": "9.pdf", "ftype": "PDF", "category": None, "classification": None},
    {"disk_name": "10.pdf", "display_name": "10.pdf", "ftype": "PDF", "category": None, "classification": None},
]

async def restore():
    async with AsyncSessionLocal() as db:
        # Get admin user
        res = await db.execute(select(text("id from users where cpf='100001'")))
        admin_id = res.scalar()
        if not admin_id:
            print("Admin user not found")
            return

        upload_dir = settings.UPLOAD_DIR

        for fd in FILES_TO_RESTORE:
            disk_path = os.path.join(upload_dir, fd["disk_name"])
            if not os.path.exists(disk_path):
                print(f"  Not found: {disk_path}")
                continue

            with open(disk_path, "rb") as fh:
                contents = fh.read()

            # Build new nested path
            rel_path = build_file_path(upload_dir, fd.get("category"), fd.get("classification"), fd["display_name"])
            if disk_path != rel_path and not os.path.exists(rel_path):
                os.makedirs(os.path.dirname(rel_path), exist_ok=True)
                os.rename(disk_path, rel_path)
                print(f"  Moved: {fd['disk_name']} -> {rel_path}")

            await db.execute(text("""
                INSERT INTO files (file_name, file_type, category, classification, status, uploaded_by, file_size, file_path, file_data)
                VALUES (:name, :type, :cat, :cls, 'Pending', :uid, :size, :path, :data)
            """), {
                "name": fd["display_name"], "type": fd["ftype"],
                "cat": fd.get("category"), "cls": fd.get("classification"),
                "uid": admin_id, "size": f"{len(contents)/1024:.1f} KB",
                "path": rel_path, "data": contents,
            })
            print(f"  Restored: {fd['display_name']} -> {rel_path} ({len(contents)} bytes)")

        await db.commit()
        print("\nDone. Verify with: docker exec backend-db-1 psql -U ongc_user -d ongc_db -c \"SELECT file_name, status FROM files WHERE file_name NOT LIKE 'seed_%';\"")

asyncio.run(restore())
