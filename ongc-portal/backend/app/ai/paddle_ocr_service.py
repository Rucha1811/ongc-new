import json
import sys
import os

PADDLE_PYTHON = "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3.13"

SUBPROCESS_SCRIPT = os.path.join(os.path.dirname(__file__), "_paddle_ocr_worker.py")

def parse_pdf_paddle_ppocrv5(file_path: str):
    import subprocess
    result = subprocess.run(
        [PADDLE_PYTHON, SUBPROCESS_SCRIPT, file_path],
        capture_output=True, text=True, timeout=600,
    )
    if result.returncode != 0:
        return None, None
    data = json.loads(result.stdout)
    return data.get("text", ""), data.get("pages", [])
