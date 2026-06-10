from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.models.base import User
from app.auth.deps import get_current_user

router = APIRouter()

@router.get("/tables")
async def list_all_tables(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view database tables")

    result = await db.execute(
        text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
    )
    tables = [row[0] for row in result.fetchall()]

    db_data = {}
    for table in tables:
        rows_result = await db.execute(text(f"SELECT * FROM \"{table}\""))
        columns = rows_result.keys()
        rows = [dict(zip(columns, row)) for row in rows_result.fetchall()]

        serializable_rows = []
        for row in rows:
            serializable_row = {}
            for k, v in row.items():
                if isinstance(v, bytes):
                    serializable_row[k] = v.hex()
                else:
                    serializable_row[k] = str(v) if not isinstance(v, (str, int, float, bool, type(None))) else v
            serializable_rows.append(serializable_row)

        db_data[table] = {
            "columns": list(columns),
            "rows": serializable_rows,
            "row_count": len(serializable_rows),
        }

    return db_data
