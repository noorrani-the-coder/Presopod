import io

import fitz  # PyMuPDF


def _extract_text_native(doc):
    text_parts = []
    for page in doc:
        text_parts.append(page.get_text("text") or "")
    return "\n".join(text_parts).strip()


def _extract_text_ocr(doc):
    try:
        import pytesseract
        from PIL import Image
    except Exception:
        return ""

    text_parts = []
    for page in doc:
        # Upscale page render for better OCR quality.
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False)
        image = Image.open(io.BytesIO(pix.tobytes("png")))
        page_text = pytesseract.image_to_string(image) or ""
        text_parts.append(page_text)
    return "\n".join(text_parts).strip()


def extract_pdf_text(file_path):
    doc = fitz.open(file_path)
    try:
        text = _extract_text_native(doc)
        if text:
            return text
        # Fallback for scanned/image-only PDFs.
        return _extract_text_ocr(doc)
    finally:
        doc.close()


