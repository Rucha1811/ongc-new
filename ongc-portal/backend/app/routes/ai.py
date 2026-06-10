import json
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from fastapi.responses import FileResponse
from sqlalchemy import text, select
from app.database import AsyncSessionLocal
from app.models.base import User, File, UserPermission
from app.models.ai_models import AiAuditLog
from app.auth.deps import get_current_user
from app.ai.rag_pipeline import rag
from app.ai.vector_store import vector_store
from app.ai.knowledge_graph import kg
from app.ai.report_generator import report_gen
from app.ai.llm_client import llm

router = APIRouter()

async def _log_audit(user_id: int, query: str, response: str, agent_type: str,
                     sources: list = None, sql_query: str = None, chart_data: dict = None,
                     tokens: int = 0, processing_ms: int = 0):
    async with AsyncSessionLocal() as db:
        log = AiAuditLog(
            user_id=user_id, query=query, response=response,
            agent_type=agent_type, documents_retrieved=[s.get("file_id") for s in (sources or [])] if sources else [],
            sql_query=sql_query, chart_data=chart_data, tokens_used=tokens,
            processing_time_ms=processing_ms,
        )
        db.add(log)
        await db.commit()

# ─── Document Indexing ───

@router.post("/index-file/{file_id}")
async def index_file(file_id: int, current_user: User = Depends(get_current_user)):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins can index files")

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(File).where(File.id == file_id))
        f = result.scalar_one_or_none()
        if not f:
            raise HTTPException(status_code=404, detail="File not found")
        file_path = f.file_path
        file_name = f.file_name

    import os
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    from app.ai.queue import index_queue
    from worker import index_document_job

    job = index_queue.enqueue(index_document_job, str(file_id), file_path)

    return {
        "file_id": str(file_id),
        "file_name": file_name,
        "job_id": job.id,
        "status": "queued",
    }


@router.get("/index-status/{file_id}")
async def file_index_status(file_id: int, current_user: User = Depends(get_current_user)):
    chunks = await vector_store.get_document_chunks(file_id)
    return {"file_id": file_id, "chunks_count": len(chunks)}


@router.get("/job-status/{job_id}")
async def job_status(job_id: str, current_user: User = Depends(get_current_user)):
    from app.ai.queue import get_job_status
    return get_job_status(job_id)


@router.post("/reindex-all")
async def reindex_all(current_user: User = Depends(get_current_user)):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins can reindex")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(File))
        files = result.scalars().all()

    total_chunks = 0
    indexed = []
    for f in files:
        import os
        if f.file_path and os.path.exists(f.file_path):
            await vector_store.delete_chunks_for_file(f.id)
            cnt = await rag.index_document(f.id, f.file_path)
            total_chunks += cnt
            indexed.append({"file_id": f.id, "file_name": f.file_name, "chunks": cnt})
    return {"files_indexed": len(indexed), "total_chunks": total_chunks, "details": indexed}


@router.get("/vector-stats")
async def vector_stats(current_user: User = Depends(get_current_user)):
    total_chunks = await vector_store.count_chunks()
    total_files = await vector_store.count_indexed_files()
    return {"total_chunks": total_chunks, "total_files": total_files}

# ─── Knowledge Graph ───

@router.get("/knowledge-graph")
async def get_knowledge_graph(current_user: User = Depends(get_current_user)):
    return await kg.get_graph_data()


@router.get("/knowledge-graph/entities")
async def get_kg_entities(current_user: User = Depends(get_current_user)):
    return await kg.get_all_entities()


@router.get("/knowledge-graph/relationships")
async def get_kg_relationships(current_user: User = Depends(get_current_user)):
    return await kg.get_all_relationships()


@router.get("/knowledge-graph/stats")
async def kg_stats(current_user: User = Depends(get_current_user)):
    return await kg.get_stats()

# ─── SQL Agent ───

@router.post("/sql-query")
async def sql_query(
    payload: dict = Body(...),
    current_user: User = Depends(get_current_user),
):
    query = payload.get("query", "")
    from app.ai.sql_agent import sql_agent
    return await sql_agent.query(query)

# ─── Report Generation ───

@router.post("/generate-report")
async def generate_report(
    payload: dict = Body(...),
    current_user: User = Depends(get_current_user),
):
    topic = payload.get("topic", "")
    format = payload.get("format", "pdf")
    result = await report_gen.generate_report(topic, format, current_user.name)
    return result


@router.get("/download-report")
async def download_report(
    file_path: str = Query(...),
    current_user: User = Depends(get_current_user),
):
    import os
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Report file not found")
    filename = os.path.basename(file_path)
    return FileResponse(file_path, filename=filename, media_type="application/octet-stream")

# ─── Search ───

@router.post("/search")
async def ai_search(
    payload: dict = Body(...),
    current_user: User = Depends(get_current_user),
):
    query = payload.get("query", "")
    search_type = payload.get("search_type", "hybrid")
    top_k = payload.get("top_k", 10)
    user_role = current_user.role.name if current_user.role else "viewer"
    async with AsyncSessionLocal() as db:
        perm_result = await db.execute(
            select(UserPermission).where(UserPermission.user_id == current_user.id)
        )
        user_permissions = perm_result.scalars().all()
        user_classifications = [p.classification for p in user_permissions]

    if search_type == "semantic":
        embedding = await llm.embed(query)
        if not embedding:
            return {"error": "Embedding failed", "results": []}
        results = await vector_store.search_with_permissions(
            query, embedding, str(current_user.id), user_role,
            user_classifications, top_k,
        )
    elif search_type == "keyword":
        results = await vector_store.search_by_keyword_with_permissions(
            query, str(current_user.id), user_role,
            user_classifications, top_k,
        )
    else:
        embedding = await llm.embed(query)
        if not embedding:
            results = await vector_store.search_by_keyword_with_permissions(
                query, str(current_user.id), user_role,
                user_classifications, top_k,
            )
        else:
            results = await vector_store.hybrid_search_with_permissions(
                query, embedding, str(current_user.id), user_role,
                user_classifications, top_k,
            )
    return {"query": query, "search_type": search_type, "results": results, "count": len(results)}

# ─── Summarize ───

@router.get("/summarize/{file_id}")
async def summarize_document(file_id: int, current_user: User = Depends(get_current_user)):
    summary = await rag.generate_summary(file_id)
    return {"file_id": file_id, "summary": summary}


@router.get("/related/{file_id}")
async def related_documents(file_id: int, current_user: User = Depends(get_current_user)):
    related = await rag.suggest_related_documents(file_id)
    return {"file_id": file_id, "related": related}


@router.get("/audit-log")
async def get_audit_log(
    limit: int = Query(50),
    current_user: User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("""
                SELECT a.id, a.query, a.response, a.agent_type, a.processing_time_ms,
                       a.sql_query, a.created_at, u.name as user_name
                FROM ai_audit_logs a
                JOIN users u ON u.id = a.user_id
                ORDER BY a.created_at DESC
                LIMIT :limit
            """),
            {"limit": limit},
        )
        rows = result.fetchall()
        return [
            {
                "id": str(r[0]), "query": r[1], "response": r[2],
                "agent_type": r[3], "processing_time_ms": r[4],
                "sql_query": r[5], "created_at": str(r[6]),
                "user_name": r[7],
            }
            for r in rows
        ]

@router.get("/audit-stats")
async def audit_stats(current_user: User = Depends(get_current_user)):
    if not current_user.role or current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Only admins")
    async with AsyncSessionLocal() as db:
        total = await db.execute(text("SELECT COUNT(*) FROM ai_audit_logs"))
        avg_time = await db.execute(text("SELECT COALESCE(AVG(processing_time_ms), 0) FROM ai_audit_logs"))
        by_agent = await db.execute(text("""
            SELECT agent_type, COUNT(*) as cnt FROM ai_audit_logs
            WHERE agent_type IS NOT NULL GROUP BY agent_type ORDER BY cnt DESC
        """))
        recent = await db.execute(text("""
            SELECT DATE(created_at) as day, COUNT(*) as cnt
            FROM ai_audit_logs GROUP BY day ORDER BY day DESC LIMIT 7
        """))
        return {
            "total_queries": total.scalar() or 0,
            "avg_processing_time_ms": round(float(avg_time.scalar() or 0)),
            "by_agent": {r[0]: r[1] for r in by_agent.fetchall()},
            "recent_activity": [{"date": str(r[0]), "count": r[1]} for r in recent.fetchall()],
        }
