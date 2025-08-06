import sys
import json
import os
import traceback
import logging
from paddleocr import PaddleOCR
import cv2
import numpy as np
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
# Настройка логирования
logging.basicConfig(
    filename='paddleocr.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logging.info("init PaddleOCR")
ocr = PaddleOCR(lang='ru')

def draw_ocr_box_txt(image, boxes, txts, scores):
    img = cv2.imread(image) if isinstance(image, str) else image
    for box, txt, score in zip(boxes, txts, scores):
        box = np.array(box).astype(int)
        cv2.polylines(img, [box], True, (0, 255, 0), 2)
        cv2.putText(img, f"{txt} ({score:.2f})", (box[0][0], box[0][1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1)
    return img

def draw_ocr(image, boxes, txts, scores):
    img = cv2.imread(image) if isinstance(image, str) else image
    for box in boxes:
        box = np.array(box).astype(int)
        cv2.polylines(img, [box], True, (0, 255, 0), 2)
    return img

def get_tdata(txts, scores):
    return [{"text": txt, "confidence": float(score)} for txt, score in zip(txts, scores)]

def get_results_str(txts, scores):
    return " ".join([f"{txt} ({score:.2f})" for txt, score in zip(txts, scores)])

def recognize_text(image_path, output_mode=0):
    try:
        logging.info(f"start recognizing for image: {image_path}")

        if not os.path.exists(image_path):
            raise FileNotFoundError(f"image not found: {image_path}")

        file_size = os.path.getsize(image_path)
        if file_size == 0:
            raise ValueError("image file is empty")

        result = ocr.ocr(image_path)
        logging.info(f"Type of result: {type(result)}")

        # Логируем только rec_texts и rec_scores
        if isinstance(result, list) and len(result) > 0:
            for idx, item in enumerate(result):
                if isinstance(item, dict):
                    rec_texts = item.get('rec_texts', None)
                    rec_scores = item.get('rec_scores', None)
                else:
                    rec_texts = getattr(item, 'rec_texts', None)
                    rec_scores = getattr(item, 'rec_scores', None)
                logging.warning(f"Page {idx} rec_texts: {rec_texts}")
                logging.warning(f"Page {idx} rec_scores: {rec_scores}")
        else:
            logging.warning("result is empty or not a list")

        # Извлекаем данные из результата
        txts, scores, boxes = [], [], []
        if isinstance(result, list) and len(result) > 0:
            # Берем только первую страницу (или первый результат)
            item = result[0]
            if isinstance(item, dict):
                txts = item.get('rec_texts', [])
                scores = item.get('rec_scores', [])
                boxes = item.get('rec_polys', [])
            else:
                txts = getattr(item, 'rec_texts', [])
                scores = getattr(item, 'rec_scores', [])
                boxes = getattr(item, 'rec_polys', [])
        else:
            logging.warning("No valid OCR result structure")
            return {
                "text": "",
                "confidence": 0.0,
                "words": [],
                "word_count": 0,
                "im_show": None,
                "tdata": [],
                "results_str": ""
            }

        logging.info(f"recognized {len(txts)} words")

        if not txts:
            logging.warning("no data extracted after processing")
            return {
                "text": "",
                "confidence": 0.0,
                "words": [],
                "word_count": 0,
                "im_show": None,
                "tdata": [],
                "results_str": ""
            }

        # Рисование в зависимости от output_mode
        if output_mode == 0:
            im_show = draw_ocr_box_txt(image_path, boxes, txts, scores)
        elif output_mode == 1:
            im_show = draw_ocr(image_path, boxes, txts, scores)
        else:
            im_show = None

        tdata = get_tdata(txts, scores)
        results_str = get_results_str(txts, scores)
        full_text = " ".join(txts)
        total_confidence = sum(scores)
        word_count = len(txts)
        avg_confidence = total_confidence / word_count if word_count > 0 else 0.0

        logging.info("recognizing end successfully")

        return {
            "text": full_text.strip(),
            "confidence": float(avg_confidence),
            "words": tdata,
            "word_count": word_count,
            "im_show": im_show.tolist() if isinstance(im_show, np.ndarray) else None,
            "tdata": tdata,
            "results_str": results_str
        }

    except Exception as e:
        error_details = traceback.format_exc()
        logging.error(f"error recognizing: {str(e)}\n{error_details}")
        return {
            "text": "",
            "confidence": 0.0,
            "words": [],
            "word_count": 0,
            "im_show": None,
            "tdata": [],
            "results_str": "",
            "error": str(e),
            "error_details": error_details
        }

def main():
    logging.info("start main")

    if len(sys.argv) != 2:
        logging.warning("wrong arguments count")
        print(json.dumps({
            "error": "Неверное количество аргументов. Использование: python paddleocr_script.py <image_path>"
        }))
        sys.exit(1)

    image_path = sys.argv[1]
    result = recognize_text(image_path)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    logging.info("end")

if __name__ == "__main__":
    main()