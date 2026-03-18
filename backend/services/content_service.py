from PyPDF2 import PdfReader
from PIL import Image
import pytesseract

def extract_content(file, text):
    if text:
        return text

    if not file:
        return ""

    if file.filename.endswith(".pdf"):
        reader = PdfReader(file)
        pages = []
        for p in reader.pages:
            t = p.extract_text()
            if t:
                pages.append(t)
        return " ".join(pages)

    if file.filename.lower().endswith(("png", "jpg", "jpeg")):
        image = Image.open(file)
        return pytesseract.image_to_string(image)

    return ""
