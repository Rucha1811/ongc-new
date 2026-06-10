from app.ai.llm_client import llm
from sqlalchemy import text
from app.database import AsyncSessionLocal
import json

def _normalize_confidence(distance: float) -> float:
    return round(max(0, min(100, (1 - distance) * 100)), 2)

class VectorStore:
    async def ensure_extension(self):
        async with AsyncSessionLocal() as db:
            try:
                await db.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                await db.commit()
            except Exception:
                pass

    async def store_embedding(self, file_id: int, chunk_index: int, chunk_text: str, embedding: list[float], metadata: dict = None, page_number: int = None):
        emb_str = json.dumps(embedding)
        meta_json = json.dumps(metadata or {})
        async with AsyncSessionLocal() as db:
            await db.execute(
                text("""
                    INSERT INTO document_chunks (file_id, chunk_index, chunk_text, embedding, metadata, page_number)
                    VALUES (:file_id, :chunk_index, :chunk_text, CAST(:embedding AS vector), CAST(:metadata AS jsonb), :page_number)
                """),
                {
                    "file_id": file_id,
                    "chunk_index": chunk_index,
                    "chunk_text": chunk_text,
                    "embedding": f"[{','.join(str(x) for x in embedding)}]",
                    "metadata": meta_json,
                    "page_number": page_number,
                }
            )
            await db.commit()

    async def search_similar(self, query_embedding: list[float], top_k: int = 5) -> list[dict]:
        emb_str = f"[{','.join(str(x) for x in query_embedding)}]"
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT dc.id, dc.chunk_text, dc.file_id, dc.chunk_index, dc.page_number,
                           dc.metadata, f.file_name, CAST(dc.embedding AS vector) <=> CAST(:embedding AS vector) AS distance
                    FROM document_chunks dc
                    JOIN files f ON f.id = dc.file_id
                    WHERE dc.embedding IS NOT NULL
                    ORDER BY distance
                    LIMIT :top_k
                """),
                {"embedding": emb_str, "top_k": top_k}
            )
            rows = result.fetchall()
            return [
                {
                    "id": str(r[0]),
                    "text": r[1],
                    "file_id": str(r[2]),
                    "chunk_index": r[3],
                    "page_number": r[4],
                    "metadata": r[5],
                    "file_name": r[6],
                    "score": float(r[7]),
                }
                for r in rows
            ]

    async def search_by_keyword(self, query: str, top_k: int = 10) -> list[dict]:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT dc.id, dc.chunk_text, dc.file_id, dc.chunk_index, dc.page_number,
                           f.file_name,
                           ts_rank(to_tsvector('english', dc.chunk_text), plainto_tsquery('english', :query)) AS rank
                    FROM document_chunks dc
                    JOIN files f ON f.id = dc.file_id
                    WHERE to_tsvector('english', dc.chunk_text) @@ plainto_tsquery('english', :query)
                    ORDER BY rank DESC
                    LIMIT :top_k
                """),
                {"query": query, "top_k": top_k}
            )
            rows = result.fetchall()
            return [
                {
                    "id": str(r[0]),
                    "text": r[1],
                    "file_id": str(r[2]),
                    "chunk_index": r[3],
                    "page_number": r[4],
                    "file_name": r[5],
                    "score": float(r[6]) if r[6] else 0,
                }
                for r in rows
            ]

    async def hybrid_search(self, query: str, query_embedding: list[float], top_k: int = 10) -> list[dict]:
        semantic_results = await self.search_similar(query_embedding, top_k)
        keyword_results = await self.search_by_keyword(query, top_k)
        seen = set()
        merged = []
        for r in semantic_results + keyword_results:
            if r["id"] not in seen:
                seen.add(r["id"])
                merged.append(r)
        return merged[:top_k]

    async def search_with_permissions(self, query: str, query_embedding: list[float],
                                      user_id: str, user_role: str,
                                      user_classifications: list[str],
                                      top_k: int = 10) -> list[dict]:
        emb_str = f"[{','.join(str(x) for x in query_embedding)}]"
        async with AsyncSessionLocal() as db:
            if user_role == "admin":
                access_filter = ""
            elif user_classifications:
                placeholders = ", ".join([f"'{c}'" for c in user_classifications])
                access_filter = f"""AND f.status = 'Approved'
                    AND (f.classification IN ({placeholders})
                         OR f.classification = 'General / Available for All')"""
            else:
                access_filter = "AND f.status = 'Approved' AND f.classification = 'General / Available for All'"

            sql = f"""
                SELECT dc.id, dc.chunk_text, dc.file_id, dc.chunk_index, dc.page_number,
                       dc.metadata, f.file_name, f.classification,
                       CAST(dc.embedding AS vector) <=> CAST(:embedding AS vector) AS distance
                FROM document_chunks dc
                JOIN files f ON f.id = dc.file_id
                WHERE dc.embedding IS NOT NULL
                {access_filter}
                ORDER BY distance
                LIMIT :top_k
            """
            result = await db.execute(
                text(sql),
                {"embedding": emb_str, "top_k": top_k}
            )
            rows = result.fetchall()
            return [
                {
                    "id": str(r[0]),
                    "text": r[1],
                    "file_id": str(r[2]),
                    "chunk_index": r[3],
                    "page_number": r[4],
                    "metadata": r[5],
                    "file_name": r[6],
                    "classification": r[7],
                    "score": float(r[8]),
                    "confidence": _normalize_confidence(float(r[8])),
                }
                for r in rows
            ]

    async def search_by_keyword_with_permissions(self, query: str, user_id: str, user_role: str,
                                                  user_classifications: list[str],
                                                  top_k: int = 10) -> list[dict]:
        async with AsyncSessionLocal() as db:
            if user_role == "admin":
                access_filter = ""
            elif user_classifications:
                placeholders = ", ".join([f"'{c}'" for c in user_classifications])
                access_filter = f"""AND f.status = 'Approved'
                    AND (f.classification IN ({placeholders})
                         OR f.classification = 'General / Available for All')"""
            else:
                access_filter = "AND f.status = 'Approved' AND f.classification = 'General / Available for All'"

            sql = f"""
                SELECT dc.id, dc.chunk_text, dc.file_id, dc.chunk_index, dc.page_number,
                       f.file_name, f.classification,
                       ts_rank(to_tsvector('english', dc.chunk_text), plainto_tsquery('english', :query)) AS rank
                FROM document_chunks dc
                JOIN files f ON f.id = dc.file_id
                WHERE to_tsvector('english', dc.chunk_text) @@ plainto_tsquery('english', :query)
                {access_filter}
                ORDER BY rank DESC
                LIMIT :top_k
            """
            result = await db.execute(
                text(sql),
                {"query": query, "top_k": top_k}
            )
            rows = result.fetchall()
            return [
                {
                    "id": str(r[0]),
                    "text": r[1],
                    "file_id": str(r[2]),
                    "chunk_index": r[3],
                    "page_number": r[4],
                    "file_name": r[5],
                    "classification": r[6],
                    "score": float(r[7]) if r[7] else 0,
                    "confidence": round(min(100, float(r[7] or 0) * 10), 2),
                }
                for r in rows
            ]

    async def hybrid_search_with_permissions(self, query: str, query_embedding: list[float],
                                              user_id: str, user_role: str,
                                              user_classifications: list[str],
                                              top_k: int = 10) -> list[dict]:
        semantic_results = await self.search_with_permissions(query, query_embedding, user_id, user_role, user_classifications, top_k)
        keyword_results = await self.search_by_keyword_with_permissions(query, user_id, user_role, user_classifications, top_k)
        seen = set()
        merged = []
        for r in semantic_results + keyword_results:
            if r["id"] not in seen:
                seen.add(r["id"])
                merged.append(r)
        return merged[:top_k]

    async def get_document_chunks(self, file_id: int) -> list[dict]:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT id, chunk_index, chunk_text, page_number, metadata
                    FROM document_chunks
                    WHERE file_id = :file_id
                    ORDER BY chunk_index
                """),
                {"file_id": file_id}
            )
            rows = result.fetchall()
            return [
                {"id": str(r[0]), "chunk_index": r[1], "text": r[2], "page_number": r[3], "metadata": r[4]}
                for r in rows
            ]

    async def delete_chunks_for_file(self, file_id: int):
        async with AsyncSessionLocal() as db:
            await db.execute(text("DELETE FROM document_chunks WHERE file_id = :file_id"), {"file_id": file_id})
            await db.commit()

    async def count_chunks(self) -> int:
        async with AsyncSessionLocal() as db:
            result = await db.execute(text("SELECT COUNT(*) FROM document_chunks"))
            return result.scalar() or 0

    async def count_indexed_files(self) -> int:
        async with AsyncSessionLocal() as db:
            result = await db.execute(text("SELECT COUNT(DISTINCT file_id) FROM document_chunks"))
            return result.scalar() or 0

vector_store = VectorStore()
