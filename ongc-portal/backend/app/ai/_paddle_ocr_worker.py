import json
import sys
import logging
logging.disable(logging.CRITICAL)

file_path = sys.argv[1]

from pdf2image import convert_from_path
import numpy as np
from paddleocr import PaddleOCR

ocr = PaddleOCR(
    use_textline_orientation=True,
    lang='en',
)

images = convert_from_path(file_path, dpi=300)
full_text = ""
pages = []

for i, img in enumerate(images):
    img_array = np.array(img)
    result = ocr.ocr(img_array)
    page_text = ""
    for page_res in result:
        rec_texts = getattr(page_res, "rec_texts", page_res.get("rec_texts", []))
        rec_scores = getattr(page_res, "rec_scores", page_res.get("rec_scores", []))
        for text, score in zip(rec_texts, rec_scores):
            if text and text.strip() and score > 0.3:
                page_text += text + "\n"
    full_text += page_text + "\n"
    pages.append({"page": i + 1, "text": page_text})

print(json.dumps({"text": full_text, "pages": pages}))
