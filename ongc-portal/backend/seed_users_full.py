"""Seed comprehensive users with categories, sections, locations & Ops Manager hierarchy."""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.future import select
from app.config import settings
from app.models.base import Base, Role, User
from app.auth.security import hash_password

DATABASE_URL = (
    f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
    f"@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
)
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

ROLES = {
    "admin": 1, "ops_manager": 2, "data_creator": 3, "viewer": 4,
}

ALL_USERS = [
    # ─── ADMIN ───
    {"cpf":"100001","name":"Sh. Sandip Kumar Kaur","pwd":"admin123","role":"admin","section":"HGS","area":"All","cat":"—","loc":"Vadodara","desig":"CGM(Geophysics-Surface)"},
    {"cpf":"100005","name":"Rucha","pwd":"Rucha","role":"admin","section":"HGS","area":"All","cat":"—","loc":"Vadodara","desig":"System Admin"},

    # ─── OPS MANAGERS ───
    {"cpf":"100002","name":"Rajiv Sharma","pwd":"ops123","role":"ops_manager","section":"Operations","area":"Operations","cat":"—","loc":"Vadodara","desig":"DGM Operations"},
    {"cpf":"100018","name":"Sanjay Gupta","pwd":"gpops","role":"ops_manager","section":"GP-03","area":"GP-03/06/15/16/36/61/81","cat":"—","loc":"Ahmedabad","desig":"Manager (GP Operations)"},
    {"cpf":"100019","name":"Ravi Agarwal","pwd":"relops","role":"ops_manager","section":"REL","area":"REL/RCC/HSE/Contracts","cat":"—","loc":"Vadodara","desig":"Manager (Support Services)"},
    {"cpf":"100027","name":"Vikas Sharma","pwd":"assetops","role":"ops_manager","section":"GP-03","area":"GP-03/06","cat":"—","loc":"Ahmedabad","desig":"Manager (Ahmedabad Assets)"},
    {"cpf":"100050","name":"Anil Kapoor","pwd":"ankops","role":"ops_manager","section":"GP-61","area":"GP-61/81","cat":"—","loc":"Ankleshwar","desig":"Manager (Ankleshwar Assets)"},
    {"cpf":"100051","name":"Sunil Dutt","pwd":"mehops","role":"ops_manager","section":"GP-15","area":"GP-15/16","cat":"—","loc":"Mehsana","desig":"Manager (Mehsana Assets)"},
    {"cpf":"100052","name":"Rajendra Singh","pwd":"rajops","role":"ops_manager","section":"GP-36","area":"GP-36","cat":"—","loc":"Jodhpur","desig":"Manager (Rajasthan Assets)"},

    # ─── DATA CREATORS — GP Areas (under Sanjay Gupta) ───
    {"cpf":"100003","name":"Mahavir Singh","pwd":"user123","role":"data_creator","section":"GP-36","area":"GP-36","cat":"Seismic Data","loc":"Linch","desig":"Senior Geophysicist","om":"Sanjay Gupta"},
    {"cpf":"100006","name":"Anil Verma","pwd":"gp0303","role":"data_creator","section":"GP-03","area":"GP-03","cat":"Seismic Data","loc":"Jambusar","desig":"Geophysicist","om":"Sanjay Gupta"},
    {"cpf":"100007","name":"Vikram Singh","pwd":"gp0606","role":"data_creator","section":"GP-06","area":"GP-06","cat":"Well Data","loc":"Gandhar","desig":"Sr. Field Geophysicist","om":"Sanjay Gupta"},
    {"cpf":"100008","name":"Rakesh Patel","pwd":"gp1515","role":"data_creator","section":"GP-15","area":"GP-15","cat":"Seismic Data","loc":"Mehsana","desig":"Geophysicist","om":"Sanjay Gupta"},
    {"cpf":"100009","name":"Suresh Nair","pwd":"gp1616","role":"data_creator","section":"GP-16","area":"GP-16","cat":"Seismic Data","loc":"Valod","desig":"Field Geophysicist","om":"Sanjay Gupta"},
    {"cpf":"100010","name":"Meena Joshi","pwd":"gp6161","role":"data_creator","section":"GP-61","area":"GP-61","cat":"Seismic Data","loc":"Ankleshwar","desig":"Geophysicist","om":"Sanjay Gupta"},
    {"cpf":"100011","name":"Deepak Yadav","pwd":"gp8181","role":"data_creator","section":"GP-81","area":"GP-81","cat":"Well Data","loc":"Cambay","desig":"Field Geophysicist","om":"Sanjay Gupta"},
    {"cpf":"100030","name":"Amit Kumar","pwd":"gp3603","role":"data_creator","section":"GP-36","area":"GP-36","cat":"Seismic Data","loc":"Linch","desig":"Jr. Geophysicist","om":"Sanjay Gupta"},
    {"cpf":"100031","name":"Sunita Devi","pwd":"gp0306","role":"data_creator","section":"GP-03","area":"GP-03","cat":"Well Data","loc":"Jambusar","desig":"Field Assistant","om":"Sanjay Gupta"},
    {"cpf":"100032","name":"Rajesh Verma","pwd":"gpgp15","role":"data_creator","section":"GP-15","area":"GP-15","cat":"Seismic Data","loc":"Mehsana","desig":"Geophysicist","om":"Sanjay Gupta"},

    # ─── DATA CREATORS — Support Services (under Ravi Agarwal) ───
    {"cpf":"100012","name":"Pooja Sharma","pwd":"relrel","role":"data_creator","section":"REL","area":"REL","cat":"Legal","loc":"Vadodara","desig":"Legal Officer","om":"Ravi Agarwal"},
    {"cpf":"100013","name":"Manoj Tiwari","pwd":"rccrcc","role":"data_creator","section":"RCC","area":"RCC","cat":"Accounts","loc":"Vadodara","desig":"Accounts Officer","om":"Ravi Agarwal"},
    {"cpf":"100014","name":"Sunil Kumar","pwd":"hsehse","role":"data_creator","section":"HSE","area":"HSE","cat":"HSE","loc":"Vadodara","desig":"HSE Officer","om":"Ravi Agarwal"},
    {"cpf":"100015","name":"Arjun Mehta","pwd":"concon","role":"data_creator","section":"Contracts","area":"Contracts","cat":"Contracts","loc":"Ahmedabad","desig":"Contracts Manager","om":"Ravi Agarwal"},
    {"cpf":"100033","name":"Neelam Joshi","pwd":"relrel2","role":"data_creator","section":"REL","area":"REL","cat":"Legal","loc":"Vadodara","desig":"Asst. Legal Officer","om":"Ravi Agarwal"},
    {"cpf":"100034","name":"Vijay Patil","pwd":"rccrcc2","role":"data_creator","section":"RCC","area":"RCC","cat":"Accounts","loc":"Vadodara","desig":"Jr. Accounts Officer","om":"Ravi Agarwal"},
    {"cpf":"100035","name":"Anita Sharma","pwd":"hsehse2","role":"data_creator","section":"HSE","area":"HSE","cat":"HSE","loc":"Ankleshwar","desig":"Safety Officer","om":"Ravi Agarwal"},
    {"cpf":"100036","name":"Rohit Singh","pwd":"concon2","role":"data_creator","section":"Contracts","area":"Contracts","cat":"Contracts","loc":"Vadodara","desig":"Contract Executive","om":"Ravi Agarwal"},

    # ─── DATA CREATORS — Ahmedabad (under Vikas Sharma) ───
    {"cpf":"100023","name":"Hemant Desai","pwd":"ahmedabad","role":"data_creator","section":"GP-03","area":"Ahmedabad","cat":"Seismic Data","loc":"Ahmedabad","desig":"Geophysicist","om":"Vikas Sharma"},
    {"cpf":"100037","name":"Suresh Rathod","pwd":"ahm002","role":"data_creator","section":"GP-06","area":"Ahmedabad","cat":"Seismic Data","loc":"Ahmedabad","desig":"Jr. Geophysicist","om":"Vikas Sharma"},

    # ─── DATA CREATORS — Ankleshwar (under Anil Kapoor) ───
    {"cpf":"100024","name":"Prakash Nair","pwd":"ankleshwar","role":"data_creator","section":"GP-61","area":"Ankleshwar","cat":"Well Data","loc":"Ankleshwar","desig":"Field Geophysicist","om":"Anil Kapoor"},
    {"cpf":"100038","name":"Geeta Reddy","pwd":"ank002","role":"data_creator","section":"GP-61","area":"Ankleshwar","cat":"Well Data","loc":"Ankleshwar","desig":"Field Assistant","om":"Anil Kapoor"},

    # ─── DATA CREATORS — Mehsana (under Sunil Dutt) ───
    {"cpf":"100025","name":"Dinesh Patel","pwd":"mehsana","role":"data_creator","section":"GP-15","area":"Mehsana","cat":"Seismic Data","loc":"Mehsana","desig":"Geophysicist","om":"Sunil Dutt"},
    {"cpf":"100039","name":"Mohan Lal","pwd":"meh002","role":"data_creator","section":"GP-15","area":"Mehsana","cat":"Seismic Data","loc":"Mehsana","desig":"Geophysicist","om":"Sunil Dutt"},

    # ─── DATA CREATORS — Rajasthan (under Rajendra Singh) ───
    {"cpf":"100026","name":"Kamla Devi","pwd":"rajasthan","role":"data_creator","section":"GP-36","area":"Rajasthan","cat":"Seismic Data","loc":"Barmer","desig":"Field Geophysicist","om":"Rajendra Singh"},
    {"cpf":"100040","name":"Shanti Devi","pwd":"raj002","role":"data_creator","section":"GP-36","area":"Rajasthan","cat":"Seismic Data","loc":"Jaisalmer","desig":"Field Geophysicist","om":"Rajendra Singh"},

    # ─── VIEWERS (read-only access to their section) ───
    {"cpf":"100004","name":"Priya Patel","pwd":"view123","role":"viewer","section":"GP-03","area":"GP-03","cat":"Seismic Data","loc":"Jambusar","desig":"Trainee Geophysicist","om":"Sanjay Gupta"},
    {"cpf":"100020","name":"Neha Kapoor","pwd":"vie036","role":"viewer","section":"GP-36","area":"GP-36","cat":"Seismic Data","loc":"Linch","desig":"Geophysicist Trainee","om":"Sanjay Gupta"},
    {"cpf":"100021","name":"Rahul Bose","pwd":"vie003","role":"viewer","section":"GP-03","area":"GP-03","cat":"Seismic Data","loc":"Jambusar","desig":"Field Trainee","om":"Sanjay Gupta"},
    {"cpf":"100041","name":"Kavita Singh","pwd":"vie0362","role":"viewer","section":"GP-36","area":"GP-36","cat":"Seismic Data","loc":"Linch","desig":"Field Assistant","om":"Sanjay Gupta"},
    {"cpf":"100042","name":"Arun Kumar","pwd":"vie061","role":"viewer","section":"GP-06","area":"GP-06","cat":"Well Data","loc":"Gandhar","desig":"Jr. Assistant","om":"Sanjay Gupta"},
    {"cpf":"100022","name":"Karan Mehta","pwd":"vieree","role":"viewer","section":"REL","area":"REL","cat":"Legal","loc":"Vadodara","desig":"Legal Assistant","om":"Ravi Agarwal"},
    {"cpf":"100043","name":"Divya Sharma","pwd":"viercc","role":"viewer","section":"RCC","area":"RCC","cat":"Accounts","loc":"Vadodara","desig":"Accounts Assistant","om":"Ravi Agarwal"},
    {"cpf":"100044","name":"Pankaj Jain","pwd":"viehse","role":"viewer","section":"HSE","area":"HSE","cat":"HSE","loc":"Vadodara","desig":"Safety Trainee","om":"Ravi Agarwal"},
    {"cpf":"100028","name":"Sanjay Mehta","pwd":"vieahm","role":"viewer","section":"GP-03","area":"Ahmedabad","cat":"Seismic Data","loc":"Ahmedabad","desig":"Field Observer","om":"Vikas Sharma"},
    {"cpf":"100029","name":"Rohan Joshi","pwd":"vieank","role":"viewer","section":"GP-61","area":"Ankleshwar","cat":"Well Data","loc":"Ankleshwar","desig":"Data Entry Operator","om":"Anil Kapoor"},
    {"cpf":"100045","name":"Megha Desai","pwd":"viemeh","role":"viewer","section":"GP-15","area":"Mehsana","cat":"Seismic Data","loc":"Mehsana","desig":"Field Assistant","om":"Sunil Dutt"},
    {"cpf":"100046","name":"Ravi Raj","pwd":"vieraj","role":"viewer","section":"GP-36","area":"Rajasthan","cat":"Seismic Data","loc":"Barmer","desig":"Observer","om":"Rajendra Singh"},
]

async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # First seed roles
    role_data = [
        {"id": 1, "name": "admin", "description": "Full system access"},
        {"id": 2, "name": "ops_manager", "description": "Operations Manager — Level III"},
        {"id": 3, "name": "data_creator", "description": "Data Creator/Editor — Level IV"},
        {"id": 4, "name": "viewer", "description": "End User / General Viewer — Level 0"},
    ]
    async with AsyncSessionLocal() as db:
        for rd in role_data:
            res = await db.execute(select(Role).where(Role.id == rd["id"]))
            existing = res.scalar_one_or_none()
            if not existing:
                db.add(Role(id=rd["id"], name=rd["name"], description=rd["description"]))
        await db.commit()

    om_lookup = {}
    async with AsyncSessionLocal() as db:
        for u in ALL_USERS:
            res = await db.execute(select(User).where(User.cpf == u["cpf"]))
            existing = res.scalar_one_or_none()
            if existing:
                om_lookup[u["cpf"]] = existing.id
                continue

            role_id = ROLES[u["role"]]
            user = User(
                cpf=u["cpf"],
                password_hash=hash_password(u["pwd"]),
                name=u["name"],
                designation=u.get("desig",""),
                section=u["section"],
                area=u["area"],
                user_category=u["cat"],
                level={"admin":2,"ops_manager":3,"data_creator":4,"viewer":0}[u["role"]],
                is_active=True,
                role_id=role_id,
            )
            db.add(user)
            await db.flush()
            om_lookup[u["cpf"]] = user.id
            print(f"  Created: {u['name']} ({u['cpf']}) [{u['role']}] — {u['cat']} / {u['section']} / {u['loc']}")

        # Assign ops_manager_id for data_creators & viewers
        for u in ALL_USERS:
            if u["role"] not in ("data_creator", "viewer"):
                continue
            om_name = u.get("om", "")
            if not om_name:
                continue
            # Find the ops manager by name
            om_cpf = None
            for u2 in ALL_USERS:
                if u2["name"] == om_name and u2["role"] == "ops_manager":
                    om_cpf = u2["cpf"]
                    break
            if om_cpf and om_cpf in om_lookup:
                res = await db.execute(select(User).where(User.cpf == u["cpf"]))
                usr = res.scalar_one_or_none()
                if usr:
                    usr.ops_manager_id = om_lookup[om_cpf]

        await db.commit()

    print(f"\n✅ Seeded {len(ALL_USERS)} users total.")
    roles = {}
    for u in ALL_USERS:
        roles.setdefault(u["role"],0)
        roles[u["role"]] += 1
    for r, c in roles.items():
        print(f"   {r}: {c}")

if __name__ == "__main__":
    asyncio.run(seed())
