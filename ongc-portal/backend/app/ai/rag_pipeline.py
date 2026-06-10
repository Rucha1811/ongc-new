import time
from typing import Optional
from app.ai.llm_client import llm
from app.ai.vector_store import vector_store
from app.ai.document_parser import parse_file, chunk_text_with_pages
from app.config import settings

class RAGPipeline:
    async def index_document(self, file_id: int, file_path: str):
        text, pages = parse_file(file_path)
        if not text.strip():
            return 0
        await vector_store.delete_chunks_for_file(file_id)
        chunks = chunk_text_with_pages(text, pages, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
        for chunk in chunks:
            embedding = await llm.embed(chunk["text"])
            if embedding:
                page = chunk["page_numbers"][0] if chunk.get("page_numbers") else None
                await vector_store.store_embedding(
                    file_id=file_id,
                    chunk_index=chunk["chunk_index"],
                    chunk_text=chunk["text"],
                    embedding=embedding,
                    page_number=page,
                )
        return len(chunks)

    async def query(self, question: str, user_id: Optional[str] = None,
                     user_role: Optional[str] = None,
                     user_classifications: Optional[list[str]] = None,
                     conversation_history: Optional[list] = None) -> dict:
        start_time = time.time()
        query_embedding = await llm.embed(question)
        if not query_embedding:
            return {"answer": "Sorry, I couldn't process your query. The embedding service may be unavailable.", "sources": [], "processing_time_ms": 0}

        if user_id and user_role:
            documents = await vector_store.hybrid_search_with_permissions(
                question, query_embedding, user_id, user_role,
                user_classifications or [], settings.TOP_K_DOCUMENTS
            )
        else:
            documents = await vector_store.hybrid_search(question, query_embedding, settings.TOP_K_DOCUMENTS)

        file_groups = {}
        for doc in documents:
            fid = doc["file_id"]
            if fid not in file_groups:
                file_groups[fid] = {"file_id": fid, "file_name": doc["file_name"], "chunks": [], "scores": [], "pages": set()}
            file_groups[fid]["chunks"].append(doc["text"])
            file_groups[fid]["scores"].append(doc.get("score", 0))
            if doc.get("page_number"):
                file_groups[fid]["pages"].add(doc["page_number"])

        context_parts = []
        sources = []
        for fid, grp in file_groups.items():
            avg_score = sum(grp["scores"]) / len(grp["scores"]) if grp["scores"] else 0
            confidence = round(max(0, min(100, (1 - avg_score) * 100)), 2)
            page_ref = f" (Pages {sorted(grp['pages'])})" if grp["pages"] else ""
            merged_text = "\n\n".join(grp["chunks"])
            source_ref = f"[Source: {grp['file_name']}{page_ref} — Confidence: {confidence}%]"
            context_parts.append(f"{merged_text}\n{source_ref}")
            sources.append({
                "file_id": fid,
                "file_name": grp["file_name"],
                "page_number": sorted(grp["pages"]) if grp["pages"] else None,
                "chunk_text": merged_text[:500],
                "score": round(avg_score, 4),
                "confidence": confidence,
            })

        history_text = ""
        if conversation_history:
            history_lines = []
            for msg in conversation_history[-4:]:
                role = "User" if msg["role"] == "user" else "Assistant"
                history_lines.append(f"{role}: {msg['content'][:300]}")
            history_text = "\n".join(history_lines)

        context = "\n\n".join(context_parts) if context_parts else "No relevant documents found."

        system_prompt = """You are ONGC AI Assistant, an expert document analyst for Oil and Natural Gas Corporation Limited.
Answer questions based on the provided document context only.
Always cite sources with file names and page numbers when available.
If the information is not found in the provided context, state clearly that the information is not available in the indexed documents.
Do NOT hallucinate or fabricate information.
Be concise, professional, and precise.
Format answers with clear sections when appropriate."""

        if history_text:
            prompt = f"""Previous conversation:
{history_text}

Relevant documents context:
{context}

Question: {question}

Answer based on the context above. Cite sources."""
        else:
            prompt = f"""Relevant documents context:
{context}

Question: {question}

Answer based on the context above. Cite sources."""

        answer = await llm.generate(prompt, system_prompt)
        processing_time = int((time.time() - start_time) * 1000)

        return {
            "answer": answer,
            "sources": sources,
            "processing_time_ms": processing_time,
        }

    async def suggest_related_documents(self, file_id: int, top_k: int = 5) -> list[dict]:
        chunks = await vector_store.get_document_chunks(file_id)
        if not chunks:
            return []
        first_chunk = chunks[0]
        embedding = await llm.embed(first_chunk["text"])
        if not embedding:
            return []
        similar = await vector_store.search_similar(embedding, top_k + 1)
        return [s for s in similar if str(s["file_id"]) != str(file_id)][:top_k]

    async def generate_summary(self, file_id: int) -> str:
        chunks = await vector_store.get_document_chunks(file_id)
        if not chunks:
            return "No content available for summarization."
        full_text = "\n".join(c["text"] for c in chunks[:10])
        if len(full_text) > 4000:
            full_text = full_text[:4000] + "..."
        prompt = f"""Summarize the following document content in 3-5 key points:
{full_text}
Summary:"""
        return await llm.generate(prompt, "You are a document summarization expert. Provide clear, concise summaries.")

rag = RAGPipeline()
