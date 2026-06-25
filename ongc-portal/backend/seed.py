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
from app.models.base import Base, Role, User, File, Project, Highlight, TechnicalReport, Lookup, ProgressReport, ManpowerStatus, ContractStatus, FundManagement, DataProcessingItem, RegionalLabEquipment, ReportingAppraisal, PendingIssue, HSEIncident, AWPItem
from app.auth.security import hash_password


def sanitize_folder_name(name: str) -> str:
    if not name:
        return "Uncategorized"
    safe = name.replace("/", "_").replace(" ", "_")
    while "__" in safe:
        safe = safe.replace("__", "_")
    return safe.strip("_")

def build_file_path(upload_dir: str, category: str, classification: str, filename: str,
                    project_name: str = None, section: str = None) -> str:
    """Build nested path: uploads/{project}/{section}/{classification}/{filename}
    Falls back gracefully when project/section are None."""
    proj_dir = sanitize_folder_name(project_name) if project_name else "Uncategorized"
    sec_dir = sanitize_folder_name(section) if section else "General"
    cls_dir = sanitize_folder_name(classification) if classification else "Unclassified"
    folder = os.path.join(upload_dir, proj_dir, sec_dir, cls_dir)
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
    {"cpf": "100003", "password": "user123",   "name": "Sh. Mahavir Singh",       "designation": "Senior Geophysicist",     "section": "GP-36",       "level": 4, "role": "data_creator", "area": "GP-36", "user_category": "Geophysics"},
    {"cpf": "100004", "password": "view123",   "name": "Smt. Priya Patel",        "designation": "Field Geophysicist",      "section": "GP-03",       "level": 0, "role": "viewer", "area": "GP-03"},
]

DEMO_HIGHLIGHTS = [
    {"title":"Record Survey Coverage in Cambay", "description":"GP-03 team achieved 100% coverage in CB-ONHP-2022/1 block, 2 months ahead of schedule.", "author":"Field Director", "icon":"🏆"},
    {"title":"Successful VSP Operation in Mehsana", "description":"VSP data acquisition completed with zero safety incidents. Team commendation received.", "author":"Operations Head", "icon":"⭐"},
    {"title":"New Data Processing Milestone", "description":"PG-II processing throughput improved by 40% after software upgrade.", "author":"Data Processing Incharge", "icon":"📈"},
    {"title":"HSE Excellence Award", "description":"Regional office received Gold Rating in Annual HSE Audit 2024-25.", "author":"HSE Officer", "icon":"🛡️"},
    {"title":"GP-81 Crew Achieves Zero LTI", "description":"GP-81 crew completed 500,000 man-hours without a lost time incident.", "author":"Safety Officer", "icon":"🏅"},
    {"title":"New Software Deployment", "description":"Enterprise GIS platform deployed across all sections for real-time data visualization.", "author":"IT Head", "icon":"💡"},
]

DEMO_TECH_REPORTS = [
    {"title":"Reconnaissance Survey - Cambay Block", "category":"Reconnaissance Reports", "author":"A. Gupta", "status":"Approved"},
    {"title":"Route Survey - Kutch Region", "category":"Reconnaissance Reports", "author":"S. Patel", "status":"Draft"},
    {"title":"Long-Offset 2D Cambay - Progress Report #12", "category":"Project Reports", "author":"Project Incharge", "status":"Approved"},
    {"title":"3D Jambusar - Final Acquisition Report", "category":"Project Reports", "author":"Team Lead", "status":"Submitted"},
    {"title":"VSP Mehsana - Processing Report", "category":"Project Reports", "author":"Data Processing", "status":"Draft"},
    {"title":"Monthly Operations Summary - May 2025", "category":"Operations Reports", "author":"Ops Manager", "status":"Approved"},
    {"title":"Equipment Utilization Report", "category":"Operations Reports", "author":"Logistics", "status":"Submitted"},
    {"title":"Daily Log - GP-03 (01-15 June 2025)", "category":"Field Observer Logs", "author":"Field Observer", "status":"Approved"},
    {"title":"Night Observation Report - GP-06", "category":"Field Observer Logs", "author":"Night Shift Incharge", "status":"Submitted"},
    {"title":"Quality Control Report - Seismic Data", "category":"Project Reports", "author":"QC Team", "status":"Under Review"},
]

DEMO_PROJECTS = [
    {"project_name":"Long-Offset 2D", "number":"SIG-532", "category":"Seismic", "location":"Linch and Jotana", "survey_type":"2D Seismic", "contractor_name":"M/s GeoSurvey India", "area_name":"Ankleshwar", "section":"GP-81", "party_chief":"Sh. Rajiv Sharma", "year_field_season":"2024-25", "status":"Active"},
    {"project_name":"VSP Survey Valod", "number":"G533", "category":"Borehole", "location":"Valod", "survey_type":"VSP", "contractor_name":"M/s Borewell Tech", "area_name":"Ahmedabad", "section":"GP-16", "party_chief":"Sh. Sandip Kumar Kaur", "year_field_season":"2024-25", "status":"Active"},
    {"project_name":"LFPS Rajasthan", "number":"SIG-601", "category":"LFPS", "location":"Barmer", "survey_type":"LFPS", "contractor_name":"M/s Rajasthan Survey", "area_name":"Rajasthan", "section":"RCC", "party_chief":"Sh. Mahavir Singh", "year_field_season":"2024-25", "status":"Active"},
    {"project_name":"3D Seismic Mehsana", "number":"SIG-490", "category":"Seismic", "location":"Mehsana", "survey_type":"3D Seismic", "contractor_name":"M/s GeoSurvey India", "area_name":"Mehsana", "section":"Contracts", "party_chief":"Sh. Rajiv Sharma", "year_field_season":"2024-25", "status":"Active"},
    {"project_name":"2D Kutch Survey", "number":"SIG-410", "category":"Seismic", "location":"Kutch", "survey_type":"2D Seismic", "contractor_name":"M/s Kutch Exploration", "area_name":"Ankleshwar", "section":"REL", "party_chief":"Sh. Sandip Kumar Kaur", "year_field_season":"2023-24", "status":"Completed"},
    {"project_name":"Navigation Survey GP-06", "number":"SIG-522", "category":"Navigation", "location":"Jambusar", "survey_type":"Navigation", "contractor_name":"M/s NavTech", "area_name":"Ahmedabad", "section":"GP-06", "party_chief":"Sh. Mahavir Singh", "year_field_season":"2024-25", "status":"Active"},
    {"project_name":"Annual Operations Review", "number":"N/A", "category":"Review", "location":"Vadodara", "survey_type":"Review", "contractor_name":"Internal", "area_name":"Gujarat", "section":"GP-81", "party_chief":"Sh. Sandip Kumar Kaur", "year_field_season":"2024-25", "status":"Active"},
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
                    area=ud.get("area"),
                    user_category=ud.get("user_category"),
                    level=ud["level"],
                    is_active=True,
                    role_id=role_map[ud["role"]].id,
                )
                db.add(user)
                print(f"  Created user: {ud['name']} ({ud['cpf']})")
            else:
                if ud.get("area"):
                    user.area = ud["area"]
                if ud.get("user_category"):
                    user.user_category = ud["user_category"]
                print(f"  User exists: {ud['cpf']}")
            user_map[ud["cpf"]] = user
        await db.commit()

        # Set ops_manager relationships
        ops_user = user_map.get("100002")
        if ops_user:
            for cpf in ("100003", "100004"):
                u = user_map.get(cpf)
                if u and not u.ops_manager_id:
                    u.ops_manager_id = ops_user.id
                    print(f"  Assigned ops_manager 100002 to {cpf}")
        await db.commit()

        # Refresh user_map
        for cpf in user_map:
            res = await db.execute(select(User).where(User.cpf == cpf))
            user_map[cpf] = res.scalar_one()

        # Projects
        proj_res = await db.execute(select(Project))
        existing_proj = {p.project_name for p in proj_res.scalars().all()}
        for pd in DEMO_PROJECTS:
            if pd["project_name"] in existing_proj:
                print(f"  Project exists: {pd['project_name']}")
                continue
            from datetime import date
            admin_user = user_map.get("100001")
            p = Project(
                project_name=pd["project_name"], number=pd["number"], category=pd["category"],
                location=pd["location"], survey_type=pd["survey_type"], contractor_name=pd["contractor_name"],
                area_name=pd["area_name"], section=pd["section"], party_chief=pd["party_chief"],
                year_field_season=pd["year_field_season"], status=pd["status"],
                created_by=admin_user.id if admin_user else None,
            )
            db.add(p)
            print(f"  Created project: {pd['project_name']}")
        await db.commit()

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
                file_path=build_file_path(settings.UPLOAD_DIR, fd["category"], fd["classification"], "seed_{}".format(fd['file_name']),
                                           project_name=fd.get("project_name"), section=fd.get("section")),
            )
            db.add(f)
            print(f"  Created file: {fd['file_name']}")
        await db.commit()

        # ── Highlights ──
        hl_res = await db.execute(select(Highlight))
        existing_hl = {h.title for h in hl_res.scalars().all()}
        for hd in DEMO_HIGHLIGHTS:
            if hd["title"] in existing_hl:
                print(f"  Highlight exists: {hd['title']}")
                continue
            admin_user = user_map.get("100001")
            hl = Highlight(
                title=hd["title"],
                description=hd["description"],
                author=hd["author"],
                icon=hd["icon"],
                created_by=admin_user.id if admin_user else None,
            )
            db.add(hl)
            print(f"  Created highlight: {hd['title']}")
        await db.commit()

        # ── Technical Reports ──
        tr_res = await db.execute(select(TechnicalReport))
        existing_tr = {r.title for r in tr_res.scalars().all()}
        for rd in DEMO_TECH_REPORTS:
            if rd["title"] in existing_tr:
                print(f"  Tech report exists: {rd['title']}")
                continue
            admin_user = user_map.get("100001")
            tr = TechnicalReport(
                title=rd["title"],
                category=rd["category"],
                author=rd["author"],
                status=rd["status"],
                created_by=admin_user.id if admin_user else None,
            )
            db.add(tr)
            print(f"  Created tech report: {rd['title']}")
        await db.commit()

        # ── Lookups ──
        LOOKUPS = [
            # file types
            {"type":"file_type","value":"PDF","sort":1},
            {"type":"file_type","value":"DOCX","sort":2},
            {"type":"file_type","value":"XLSX","sort":3},
            {"type":"file_type","value":"PPT","sort":4},
            {"type":"file_type","value":"TXT","sort":5},
            {"type":"file_type","value":"DAT","sort":6},
            {"type":"file_type","value":"CSV","sort":7},
            {"type":"file_type","value":"ZIP","sort":8},
            # data types
            {"type":"data_type","value":"Seismic 2D/3D/3C/4D","sort":1},
            {"type":"data_type","value":"LFPS","sort":2},
            {"type":"data_type","value":"VSP","sort":3},
            {"type":"data_type","value":"Any Other Data","sort":4},
            # sections
            {"type":"section","value":"GP-03","sort":1},
            {"type":"section","value":"GP-06","sort":2},
            {"type":"section","value":"GP-15","sort":3},
            {"type":"section","value":"GP-16","sort":4},
            {"type":"section","value":"GP-36","sort":5},
            {"type":"section","value":"GP-61","sort":6},
            {"type":"section","value":"GP-81","sort":7},
            {"type":"section","value":"REL","sort":8},
            {"type":"section","value":"RCC","sort":9},
            {"type":"section","value":"HSE","sort":10},
            {"type":"section","value":"Contracts","sort":11},
            {"type":"section","value":"Operations","sort":12},
            # categories (40+ options from user's form)
            {"type":"category","value":"General Admin","sort":1},
            {"type":"category","value":"Accounts","sort":2},
            {"type":"category","value":"Human Resources","sort":3},
            {"type":"category","value":"Vigilance","sort":4},
            {"type":"category","value":"Legal/Arbitration/CourtCase","sort":5},
            {"type":"category","value":"RTI","sort":6},
            {"type":"category","value":"Estate Management","sort":7},
            {"type":"category","value":"Information Technology","sort":8},
            {"type":"category","value":"Project Report","sort":9},
            {"type":"category","value":"Final Report","sort":10},
            {"type":"category","value":"Interim Report","sort":11},
            {"type":"category","value":"Daily Progress Report (DPR)","sort":12},
            {"type":"category","value":"Night Order / Night Observation Report","sort":13},
            {"type":"category","value":"Observer Report","sort":14},
            {"type":"category","value":"Instrumentman Report / Shootman Report","sort":15},
            {"type":"category","value":"Survey Base Map","sort":16},
            {"type":"category","value":"Shot Point Map","sort":17},
            {"type":"category","value":"Survey Data (Coordinates)","sort":18},
            {"type":"category","value":"Navigation/Survey Data","sort":19},
            {"type":"category","value":"Data Processing Report","sort":20},
            {"type":"category","value":"Processing Report by Contractor","sort":21},
            {"type":"category","value":"Check Processing Report","sort":22},
            {"type":"category","value":"Seismic Section / Stacking Velocities / TVD","sort":23},
            {"type":"category","value":"Well Logs / Composite Logs","sort":24},
            {"type":"category","value":"Crop Compensation / Farmers","sort":25},
            {"type":"category","value":"Contractual Bill Summary","sort":26},
            {"type":"category","value":"Contractor Work Order / Work Completion","sort":27},
            {"type":"category","value":"GPF / GFR","sort":28},
            {"type":"category","value":"VCC Presentation","sort":29},
            {"type":"category","value":"CEC Presentation","sort":30},
            {"type":"category","value":"Any Other Presentation","sort":31},
            {"type":"category","value":"Inspection / Audit / CAG","sort":32},
            {"type":"category","value":"Annual Report / Confidential Report","sort":33},
            {"type":"category","value":"RSAM / WSAM","sort":34},
            {"type":"category","value":"Violation Cases","sort":35},
            {"type":"category","value":"ML / PML / OLAP Block Details","sort":36},
            {"type":"category","value":"Well Data related","sort":37},
            {"type":"category","value":"Seismic Data/Field Data Cartage","sort":38},
            {"type":"category","value":"Vendor/Contractor related","sort":39},
            {"type":"category","value":"Correspondence","sort":40},
            {"type":"category","value":"Miscellaneous","sort":41},
            {"type":"category","value":"Others","sort":42},
            # field seasons
            *[{"type":"season","value":f"{y}-{str(y+1)[-2:]}","sort":i+1} for i,y in enumerate(range(1956, 2026))],
            # block names
            {"type":"block_name","value":"Ankleshwar","sort":1},
            {"type":"block_name","value":"Ahmedabad","sort":2},
            {"type":"block_name","value":"Mehsana","sort":3},
            {"type":"block_name","value":"Rajasthan","sort":4},
            {"type":"block_name","value":"Other","sort":5},
        ]
        existing_lookups = set()
        res = await db.execute(select(Lookup.type, Lookup.value))
        for row in res.all():
            existing_lookups.add((row.type, row.value))
        new_count = 0
        for ld in LOOKUPS:
            key = (ld["type"], ld["value"])
            if key in existing_lookups:
                continue
            l = Lookup(type=ld["type"], value=ld["value"], sort_order=ld["sort"])
            db.add(l)
            new_count += 1
        if new_count:
            await db.commit()
            print(f"  Added {new_count} new lookup entries")
        else:
            print(f"  All lookup entries already exist")
        from datetime import date
        # ── New Module Seed Data ──
    PROGRESS_REPORTS = [
        {"project_name":"Long-Offset 2D Cambay","block":"Ankleshwar","total":1200,"completed":780,"coverage":"65%","status":"In Progress","cpf":"100003"},
        {"project_name":"3D Survey Jambusar","block":"CB-ONHP-2022/1","total":800,"completed":800,"coverage":"100%","status":"Completed","cpf":"100003"},
        {"project_name":"VSP Mehsana","block":"Mehsana","total":350,"completed":210,"coverage":"60%","status":"In Progress","cpf":"100003"},
        {"project_name":"2D Reconnaissance Kutch","block":"Kutch","total":500,"completed":120,"coverage":"24%","status":"In Progress","cpf":"100001"},
        {"project_name":"3D High-Res Ahmedabad","block":"Ahmedabad","total":950,"completed":620,"coverage":"65%","status":"In Progress","cpf":"100001"},
    ]
    for pd in PROGRESS_REPORTS:
        r = await db.execute(select(ProgressReport).where(ProgressReport.project_name == pd["project_name"]))
        if r.scalar_one_or_none(): continue
        u = user_map.get(pd["cpf"])
        obj = ProgressReport(project_name=pd["project_name"],block=pd["block"],total=pd["total"],completed=pd["completed"],coverage=pd["coverage"],status=pd["status"],created_by=u.id if u else None)
        db.add(obj)
    await db.commit()

    MANPOWER = [
        {"category":"Geophysicists","total":25,"deployed":18,"on_leave":5,"training":2,"cpf":"100003"},
        {"category":"Field Staff","total":60,"deployed":42,"on_leave":12,"training":6,"cpf":"100003"},
        {"category":"Lab Technicians","total":15,"deployed":10,"on_leave":3,"training":2,"cpf":"100003"},
        {"category":"Admin Staff","total":20,"deployed":15,"on_leave":4,"training":1,"cpf":"100001"},
    ]
    for md in MANPOWER:
        r = await db.execute(select(ManpowerStatus).where(ManpowerStatus.category == md["category"]))
        if r.scalar_one_or_none(): continue
        u = user_map.get(md["cpf"])
        obj = ManpowerStatus(category=md["category"],total=md["total"],deployed=md["deployed"],on_leave=md["on_leave"],training=md["training"],created_by=u.id if u else None)
        db.add(obj)
    await db.commit()

    CONTRACTS = [
        {"contract":"Seismic Survey CB-ONHP-2022/1","vendor":"M/s GeoSearch Ltd","value":"₹2.4 Cr","award_date":"2024-08-15","completion_date":"2025-06-30","status":"Ongoing","cpf":"100003"},
        {"contract":"Data Processing Jambusar","vendor":"M/s DataWave Inc","value":"₹1.8 Cr","award_date":"2024-09-01","completion_date":"2025-05-15","status":"Ongoing","cpf":"100003"},
        {"contract":"VSP Equipment Supply","vendor":"M/s WellTech Corp","value":"₹75 L","award_date":"2024-11-01","completion_date":"2025-02-28","status":"Completed","cpf":"100003"},
        {"contract":"Consultancy for 2D Kutch","vendor":"M/s GeoVista Consultancy","value":"₹50 L","award_date":"2025-01-10","completion_date":"2025-12-31","status":"Ongoing","cpf":"100001"},
    ]
    for cd in CONTRACTS:
        r = await db.execute(select(ContractStatus).where(ContractStatus.contract == cd["contract"]))
        if r.scalar_one_or_none(): continue
        u = user_map.get(cd["cpf"])
        obj = ContractStatus(contract=cd["contract"],vendor=cd["vendor"],value=cd["value"],award_date=date.fromisoformat(cd["award_date"]) if cd.get("award_date") else None,completion_date=date.fromisoformat(cd["completion_date"]) if cd.get("completion_date") else None,status=cd["status"],created_by=u.id if u else None)
        db.add(obj)
    await db.commit()

    FUNDS = [
        {"head":"Seismic Surveys","allocated":45.5,"spent":28.3,"remaining":17.2,"cpf":"100003"},
        {"head":"Data Processing","allocated":18.0,"spent":12.5,"remaining":5.5,"cpf":"100003"},
        {"head":"Equipment Maintenance","allocated":8.5,"spent":5.2,"remaining":3.3,"cpf":"100003"},
        {"head":"Training & Workshops","allocated":3.0,"spent":1.8,"remaining":1.2,"cpf":"100001"},
    ]
    for fd in FUNDS:
        r = await db.execute(select(FundManagement).where(FundManagement.head == fd["head"]))
        if r.scalar_one_or_none(): continue
        u = user_map.get(fd["cpf"])
        obj = FundManagement(head=fd["head"],allocated=fd["allocated"],spent=fd["spent"],remaining=fd["remaining"],created_by=u.id if u else None)
        db.add(obj)
    await db.commit()

    DP_ITEMS = [
        {"section":"GP-36","project":"Long-Offset 2D","volume":450,"unit":"km²","progress":65,"status":"Processing","due_date":"2025-08-30","cpf":"100003"},
        {"section":"GP-16","project":"VSP Valod","volume":120,"unit":"km²","progress":90,"status":"Review","due_date":"2025-06-15","cpf":"100003"},
        {"section":"GP-81","project":"3D Ahmedabad","volume":380,"unit":"km²","progress":30,"status":"Processing","due_date":"2025-10-31","cpf":"100003"},
        {"section":"RCC","project":"LFPS Rajasthan","volume":600,"unit":"km²","progress":100,"status":"Completed","due_date":"2025-04-30","cpf":"100001"},
    ]
    for dd in DP_ITEMS:
        r = await db.execute(select(DataProcessingItem).where(DataProcessingItem.project == dd["project"]))
        if r.scalar_one_or_none(): continue
        u = user_map.get(dd["cpf"])
        obj = DataProcessingItem(section=dd["section"],project=dd["project"],volume=dd["volume"],unit=dd["unit"],progress=dd["progress"],status=dd["status"],due_date=date.fromisoformat(dd["due_date"]) if dd.get("due_date") else None,created_by=u.id if u else None)
        db.add(obj)
    await db.commit()

    LAB_EQUIP = [
        {"section":"GP-36","equipment":"Seismograph S-2000","status":"Operational","last_calibration":"2024-12-15","next_due":"2025-12-15","cpf":"100003"},
        {"section":"GP-16","equipment":"GPS Base Station","status":"Operational","last_calibration":"2025-01-20","next_due":"2026-01-20","cpf":"100003"},
        {"section":"REL","equipment":"Spectrometer","status":"Under Repair","last_calibration":"2024-06-10","next_due":"TBD","cpf":"100003"},
        {"section":"HGS","equipment":"Data Server Cluster","status":"Operational","last_calibration":"2024-11-01","next_due":"2025-11-01","cpf":"100001"},
    ]
    for ld in LAB_EQUIP:
        r = await db.execute(select(RegionalLabEquipment).where(RegionalLabEquipment.equipment == ld["equipment"]))
        if r.scalar_one_or_none(): continue
        u = user_map.get(ld["cpf"])
        obj = RegionalLabEquipment(section=ld["section"],equipment=ld["equipment"],status=ld["status"],last_calibration=date.fromisoformat(ld["last_calibration"]) if ld.get("last_calibration") else None,next_due=ld["next_due"],created_by=u.id if u else None)
        db.add(obj)
    await db.commit()

    APPRAISALS = [
        {"section":"GP-36","period":"Apr 2025","submitted":"2025-05-10","by":"Sh. Mahavir Singh","status":"Submitted","cpf":"100003"},
        {"section":"GP-36","period":"May 2025","submitted":"2025-06-08","by":"Sh. Mahavir Singh","status":"Draft","cpf":"100003"},
        {"section":"HGS","period":"Q1 2025-26","submitted":"2025-04-20","by":"Sh. Sandip Kumar Kaur","status":"Approved","cpf":"100001"},
    ]
    for ad in APPRAISALS:
        r = await db.execute(select(ReportingAppraisal).where(ReportingAppraisal.section == ad["section"], ReportingAppraisal.period == ad["period"]))
        if r.scalar_one_or_none(): continue
        u = user_map.get(ad["cpf"])
        obj = ReportingAppraisal(section=ad["section"],period=ad["period"],submitted=date.fromisoformat(ad["submitted"]) if ad.get("submitted") else None,by=ad["by"],status=ad["status"],created_by=u.id if u else None)
        db.add(obj)
    await db.commit()

    ISSUES = [
        {"description":"GPS base station interference at Jambusar site","raised_by":"Sh. Mahavir Singh","date":"2025-05-20","edc":"2025-06-15","status":"Open","cpf":"100003"},
        {"description":"Data transfer delay from field crew GP-16","raised_by":"Sh. Mahavir Singh","date":"2025-06-01","edc":"2025-06-20","status":"In Progress","cpf":"100003"},
        {"description":"Missing calibration certificate for spectrometer","raised_by":"Sh. Rajiv Sharma","date":"2025-05-15","edc":"2025-07-01","status":"Open","cpf":"100002"},
    ]
    for id_ in ISSUES:
        r = await db.execute(select(PendingIssue).where(PendingIssue.description == id_["description"]))
        if r.scalar_one_or_none(): continue
        u = user_map.get(id_["cpf"])
        obj = PendingIssue(description=id_["description"],raised_by=id_["raised_by"],date=date.fromisoformat(id_["date"]) if id_.get("date") else None,edc=date.fromisoformat(id_["edc"]) if id_.get("edc") else None,status=id_["status"],created_by=u.id if u else None)
        db.add(obj)
    await db.commit()

    HSE = [
        {"date":"2025-04-20","incident_type":"Near Miss","location":"Jambusar Site","description":"Vehicle skidded on wet mud near access road","action_taken":"Speed limit signs installed","cpf":"100003"},
        {"date":"2025-05-10","incident_type":"Equipment Damage","location":"Mehsana Workshop","description":"Cable reel fell during unloading","action_taken":"Revised lifting procedure implemented","cpf":"100003"},
        {"date":"2025-05-28","incident_type":"Safety Violation","location":"Kutch Camp","description":"Worker found without helmet in restricted area","action_taken":"Safety briefing conducted","cpf":"100001"},
    ]
    for hd in HSE:
        r = await db.execute(select(HSEIncident).where(HSEIncident.description == hd["description"]))
        if r.scalar_one_or_none(): continue
        u = user_map.get(hd["cpf"])
        obj = HSEIncident(date=date.fromisoformat(hd["date"]) if hd.get("date") else None,incident_type=hd["incident_type"],location=hd["location"],description=hd["description"],action_taken=hd["action_taken"],created_by=u.id if u else None)
        db.add(obj)
    await db.commit()

    AWP = [
        {"activity":"2D Seismic Acquisition Cambay Block","target":"500 SKM","achieved":"325 SKM","progress":"65%","deadline":"2025-12-31","status":"On Track","cpf":"100003"},
        {"activity":"3D Survey Jambusar – Phase II","target":"200 SKM","achieved":"200 SKM","progress":"100%","deadline":"2025-06-30","status":"Completed","cpf":"100003"},
        {"activity":"VSP Acquisition Mehsana","target":"12 wells","achieved":"8 wells","progress":"67%","deadline":"2025-09-30","status":"On Track","cpf":"100003"},
        {"activity":"Data Processing – 2D Kutch","target":"500 SKM","achieved":"180 SKM","progress":"36%","deadline":"2025-12-31","status":"At Risk","cpf":"100001"},
    ]
    for ad in AWP:
        r = await db.execute(select(AWPItem).where(AWPItem.activity == ad["activity"]))
        if r.scalar_one_or_none(): continue
        u = user_map.get(ad["cpf"])
        obj = AWPItem(activity=ad["activity"],target=ad["target"],achieved=ad["achieved"],progress=ad["progress"],deadline=date.fromisoformat(ad["deadline"]) if ad.get("deadline") else None,status=ad["status"],created_by=u.id if u else None)
        db.add(obj)
    await db.commit()

    print("\n✅ Seed complete.")

if __name__ == "__main__":
    asyncio.run(seed())
