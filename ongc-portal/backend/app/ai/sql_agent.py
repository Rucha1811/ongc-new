import json
import time
import traceback
from sqlalchemy import text
from app.database import AsyncSessionLocal
from app.ai.llm_client import llm
from app.config import settings

class SQLAgent:
    SCHEMA_CACHE = None

    async def get_schema(self) -> str:
        if SQLAgent.SCHEMA_CACHE:
            return SQLAgent.SCHEMA_CACHE
        async with AsyncSessionLocal() as db:
            tables = ["users", "files", "approvals", "roles", "activity_logs", "notifications", "user_permissions"]
            schema_parts = []
            for table in tables:
                result = await db.execute(text(f"""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = '{table}'
                    ORDER BY ordinal_position
                """))
                cols = result.fetchall()
                col_strs = [f"  {c[0]} ({c[1]}, nullable={c[2]})" for c in cols]
                schema_parts.append(f"TABLE {table}:\n" + "\n".join(col_strs))
            SQLAgent.SCHEMA_CACHE = "\n\n".join(schema_parts)
        return SQLAgent.SCHEMA_CACHE

    async def query(self, natural_query: str) -> dict:
        start = time.time()
        schema = await self.get_schema()
        prompt = f"""You are a PostgreSQL expert for ONGC database. Convert this question to SQL.

Database schema:
{schema}

Rules:
- Use ONLY SELECT queries (read-only)
- Use ILIKE for text matching
- Use GROUP BY for aggregations
- Use proper JOINs where needed
- Limit results to 50 rows
- Use COALESCE for nullable columns

Question: {natural_query}

Return ONLY a JSON object: {{"sql": "SELECT ...", "explanation": "brief explanation"}}"""
        response = await llm.generate(prompt, "You are a SQL expert. Return only valid JSON.")
        try:
            cleaned = response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            parsed = json.loads(cleaned.strip())
        except json.JSONDecodeError:
            return {"error": "Could not parse SQL from LLM response", "response": response}

        sql_query = parsed.get("sql", "")
        explanation = parsed.get("explanation", "")
        forbidden_keywords = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE", "GRANT"]
        sql_upper = sql_query.upper()
        if any(kw in sql_upper for kw in forbidden_keywords):
            return {"error": "Only SELECT queries are allowed", "sql": sql_query, "explanation": explanation}

        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(text(sql_query))
                columns = list(result.keys())
                rows = [dict(zip(columns, row)) for row in result.fetchall()]
                formatted_rows = []
                for row in rows:
                    formatted_rows.append({k: (str(v) if v is not None else None) for k, v in row.items()})

            processing = int((time.time() - start) * 1000)
            return {
                "sql": sql_query,
                "explanation": explanation,
                "columns": columns,
                "data": formatted_rows,
                "row_count": len(formatted_rows),
                "processing_time_ms": processing,
            }
        except Exception as e:
            return {
                "error": str(e),
                "sql": sql_query,
                "explanation": explanation,
                "traceback": traceback.format_exc(),
            }

sql_agent = SQLAgent()
