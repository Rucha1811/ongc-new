"""
Seed script — populates the database with initial roles, users, and sample files.
Run: python seed.py  (from the backend/ directory, with the DB running)
"""
import asyncio
import os
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

from app.config import settings
from app.models.base import Base, Role, User, File
from app.auth.security import hash_password


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

ROLES = [
    {"id": 1, "name": "admin",        "description": "Full system access"},
    {"id": 2, "name": "ops_manager",  "description": "Operations Manager — Level III"},
    {"id": 3, "name": "data_creator", "description": "Data Creator/Editor — Level IV"},
    {"id": 4, "name": "viewer",       "description": "End User / General Viewer — Level 0"},
]

USERS = [
    {"cpf": "100001", "password": "admin123",  "name": "Sh. Sandip Kumar Kaur",  "designation": "CGM(Geophysics-Surface)", "section": "HGS",        "level": 2, "role": "admin"},
    {"cpf": "100002", "password": "ops123",    "name": "Sh. Rajiv Sharma",        "designation": "DGM Operations",          "section": "Operations",  "level": 3, "role": "ops_manager"},
    {"cpf": "100003", "password": "user123",   "name": "Sh. Mahavir Singh",       "designation": "Senior Geophysicist",     "section": "GP-36",       "level": 4, "role": "data_creator"},
    {"cpf": "100004", "password": "view123",   "name": "Smt. Priya Patel",        "designation": "Field Geophysicist",      "section": "GP-03",       "level": 0, "role": "viewer"},
]

SAMPLE_FILES = [
    {"file_name":"GP-36 Monthly Report May_2025.pdf","file_type":"PDF","project_name":"Long-Offset 2D","sig_number":"SIG-532","data_type":"Seismic 2D/3D/3C/4D","section":"GP-81","category":"Project Report","season":"2024-25","block":"Ankleshwar","ml_block":"CB-ONHP-2022/2","location":"Linch and Jotana","classification":"General / Available for All","status":"Approved","file_size":"2.4 MB","uploader_cpf":"100003"},
    {"file_name":"Observer Report GP-16 May_2025.pdf","file_type":"PDF","project_name":"VSP Survey Valod","sig_number":"G533","data_type":"Seismic 2D/3D/3C/4D","section":"GP-16","category":"Observer Report","season":"2024-25","block":"Ahmedabad","ml_block":"CB-ONHP-2022/1","location":"Valod","classification":"General / Available for All","status":"Approved","file_size":"1.8 MB","uploader_cpf":"100003"},
    {"file_name":"Crop Compensation Records Q4 2024-25.xlsx","file_type":"XLSX","project_name":"LFPS Rajasthan","sig_number":"SIG-601","data_type":"LFPS","section":"RCC","category":"Crop Compensation / Farmers","season":"2024-25","block":"Rajasthan","ml_block":"RJ-ONHP-2021/1","location":"Barmer","classification":"Sensitive / Internal Use","status":"Approved","file_size":"890 KB","uploader_cpf":"100002"},
    {"file_name":"Contract Bill Summary FY2024-25.xlsx","file_type":"XLSX","project_name":"3D Seismic Mehsana","sig_number":"SIG-490","data_type":"Seismic 2D/3D/3C/4D","section":"Contracts","category":"Contractual Bill Summary","season":"2024-25","block":"Mehsana","ml_block":"MH-ONHP-2020/3","location":"Mehsana","classification":"Highly Confidential / Restricted","status":"Approved","file_size":"3.1 MB","uploader_cpf":"100002"},
    {"file_name":"M_s Agarwal Court Case Details.docx","file_type":"DOCX","project_name":"2D Kutch Survey","sig_number":"SIG-410","data_type":"Any Other Data","section":"REL","category":"Legal/Arbitration/CourtCase","season":"2023-24","block":"Ankleshwar","ml_block":"GK-ONHP-2021/2","location":"Kutch","classification":"Confidential","status":"Approved","file_size":"780 KB","uploader_cpf":"100001"},
    {"file_name":"Well Coordinates GP-06 2024-25.csv","file_type":"CSV","project_name":"Navigation Survey GP-06","sig_number":"SIG-522","data_type":"Seismic 2D/3D/3C/4D","section":"GP-06","category":"Navigation/Survey Data","season":"2024-25","block":"Ahmedabad","ml_block":"AH-ONHP-2022/1","location":"Jambusar","classification":"Confidential","status":"Pending","file_size":"450 KB","uploader_cpf":"100003"},
    {"file_name":"DPR May 2025 GP-36.pdf","file_type":"PDF","project_name":"Long-Offset 2D","sig_number":"SIG-532","data_type":"Seismic 2D/3D/3C/4D","section":"GP-36","category":"Daily Progress Report (DPR)","season":"2024-25","block":"Ankleshwar","ml_block":"CB-ONHP-2022/2","location":"Linch","classification":"General / Available for All","status":"Pending","file_size":"1.2 MB","uploader_cpf":"100003"},
    {"file_name":"VCC Presentation 81st GPS Vadodara.pptx","file_type":"PPT","project_name":"Annual Operations Review","sig_number":"N/A","data_type":"Any Other Data","section":"GP-81","category":"VCC Presentation","season":"2024-25","block":"Ankleshwar","ml_block":"N/A","location":"Vadodara","classification":"General / Available for All","status":"Rejected","file_size":"15.6 MB","uploader_cpf":"100003"},
]

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Roles
        role_map = {}
        for rd in ROLES:
            res = await db.execute(select(Role).where(Role.id == rd["id"]))
            role = res.scalar_one_or_none()
            if not role:
                role = Role(id=rd["id"], name=rd["name"], description=rd["description"])
                db.add(role)
                print(f"  Created role: {rd['name']} (ID: {rd['id']})")
            else:
                print(f"  Role exists: {rd['name']} (ID: {rd['id']})")
            role_map[rd["name"]] = role

        # Users
        user_map = {}
        for ud in USERS:
            res = await db.execute(select(User).where(User.cpf == ud["cpf"]))
            user = res.scalar_one_or_none()
            if not user:
                user = User(
                    cpf=ud["cpf"],
                    password_hash=hash_password(ud["password"]),
                    name=ud["name"],
                    designation=ud["designation"],
                    section=ud["section"],
                    level=ud["level"],
                    is_active=True,
                    role_id=role_map[ud["role"]].id,
                )
                db.add(user)
                print(f"  Created user: {ud['name']} ({ud['cpf']})")
            else:
                print(f"  User exists: {ud['cpf']}")
            user_map[ud["cpf"]] = user
        await db.commit()

        # Refresh user_map
        for cpf in user_map:
            res = await db.execute(select(User).where(User.cpf == cpf))
            user_map[cpf] = res.scalar_one()

        # Sample Files
        res = await db.execute(select(File))
        existing_files = {f.file_name for f in res.scalars().all()}

        for fd in SAMPLE_FILES:
            if fd["file_name"] in existing_files:
                print(f"  File exists: {fd['file_name']}")
                continue
            uploader = user_map.get(fd["uploader_cpf"])
            if not uploader:
                continue
            f = File(
                file_name=fd["file_name"],
                file_type=fd["file_type"],
                project_name=fd["project_name"],
                sig_number=fd["sig_number"],
                data_type=fd["data_type"],
                section=fd["section"],
                category=fd["category"],
                season=fd["season"],
                block=fd["block"],
                ml_block=fd["ml_block"],
                location=fd["location"],
                classification=fd["classification"],
                status=fd["status"],
                uploaded_by=uploader.id,
                upload_date=datetime.utcnow(),
                file_size=fd["file_size"],
                file_path=build_file_path(settings.UPLOAD_DIR, fd["category"], fd["classification"], "seed_{}".format(fd['file_name'])),
            )
            db.add(f)
            print(f"  Created file: {fd['file_name']}")
        await db.commit()

    print("\n✅ Seed complete.")

if __name__ == "__main__":
    asyncio.run(seed())
