import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

os.environ.setdefault("OBJC_DISABLE_INITIALIZE_FORK_SAFETY", "YES")

import asyncio
import logging
import time
from app.config import settings
from redis import Redis
from rq import Queue
import rq.exceptions
from rq.job import Job, JobStatus

logging.basicConfig(level=logging.INFO)


def index_document_job(file_id: str, file_path: str):
    file_id = int(file_id)
    from app.ai.document_parser import parse_file
    from app.ai.rag_pipeline import RAGPipeline
    from app.ai.knowledge_graph import kg

    logging.info(f"Indexing {file_id} -> {file_path}")

    text, pages = parse_file(file_path)
    if not text.strip():
        raise ValueError(f"No text extracted from {file_path}")

    rag = RAGPipeline()
    chunk_count = asyncio.run(rag.index_document(file_id, file_path))

    try:
        asyncio.run(kg.extract_entities_from_text(text[:5000], file_id))
    except Exception as e:
        logging.warning(f"KG extraction failed for {file_id}: {e}")

    return {"file_id": file_id, "chunks_indexed": chunk_count}


def run_job(job: Job):
    conn = job.connection
    key = job.key
    conn.hset(key, "status", JobStatus.STARTED.value)
    try:
        rv = job.perform()
        conn.hset(key, "status", JobStatus.FINISHED.value)
        conn.hset(key, "ended_at", str(time.time()))
        import json
        conn.hset(key, "result", json.dumps(rv))
        return rv
    except Exception as e:
        logging.exception(f"Job {job.id} failed: {e}")
        conn.hset(key, "status", JobStatus.FAILED.value)
        conn.hset(key, "exc_info", str(e))
        conn.hset(key, "ended_at", str(time.time()))
        raise


if __name__ == "__main__":
    conn = Redis.from_url(settings.REDIS_URL)
    q = Queue("pdf-indexing", connection=conn)
    logging.info("Worker started")

    while True:
        try:
            result = Queue.dequeue_any([q], timeout=1, connection=conn)
        except rq.exceptions.DequeueTimeout:
            result = None

        if result is None:
            continue

        job, queue = result
        logging.info(f"Processing job {job.id} ({job.func_name})")
        run_job(job)
