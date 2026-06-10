import json
from rq import Queue
from redis import Redis
from app.config import settings

redis_conn = Redis.from_url(settings.REDIS_URL)
index_queue = Queue("pdf-indexing", connection=redis_conn)


def get_job_status(job_id: str):
    key = f"rq:job:{job_id}"
    raw = redis_conn.hgetall(key)
    if not raw:
        return {"status": "not_found"}

    status = raw.get(b"status", b"").decode()
    result = None
    error = None

    result_raw = raw.get(b"result", b"")
    if result_raw:
        try:
            result = json.loads(result_raw)
        except (json.JSONDecodeError, TypeError):
            result = result_raw.decode()

    error_raw = raw.get(b"exc_info", b"")
    if error_raw:
        error = error_raw.decode()

    if status == "finished":
        return {"status": "completed", "result": result, "meta": {}}
    elif status == "failed":
        return {"status": "failed", "error": error, "meta": {}}
    elif status == "started":
        return {"status": "processing", "meta": {}}
    else:
        return {"status": "queued", "meta": {}}
