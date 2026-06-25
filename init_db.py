import sys, asyncio
sys.path.insert(0, '/Users/ruchatejaskumargandhi/Desktop/ONGC 3/ongc-portal/backend')
from app.database import engine
from app.models.base import Base

async def init():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created")
    await engine.dispose()

asyncio.run(init())
