from flask import Blueprint, request, jsonify, g
import os, uuid

from db import get_db_connection, to_db_json
from services.pdf_parser import extract_pdf_text
from services.ppt_parser import extract_ppt_text
from services.slide_service import summarize_into_slides, create_summary_ppt

from services.tts_service import generate_slide_audio
from utils.auth import require_auth
from voice.state_manager import SESSION_STATE

upload_bp = Blueprint("upload", __name__)

UPLOAD_DIR = "data/uploads"
OUTPUT_DIR = "data/output"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

def _has_team_slide(slides):
    if not slides:
        return False
    for slide in slides:
        title = (slide.get("title") or "").lower()
        if any(k in title for k in ["team", "members", "contributors", "authors", "our team"]):
            return True
        bullets = slide.get("bullets") or []
        if len(bullets) >= 2 and all(_looks_like_name(b) for b in bullets):
            return True
    return False


def _looks_like_name(text):
    if not text:
        return False
    parts = text.replace("-", " ").strip().split()
    if len(parts) < 2 or len(parts) > 4:
        return False
    return all(p[0].isupper() for p in parts if p)


def _make_team_slide(names):
    return {
        "title": "Team Members",
        "bullets": names
    }

# =========================
# 1️⃣ Upload PDF / PPT
# =========================
@upload_bp.route("/upload-ppt", methods=["POST"])
@require_auth
def upload_ppt():
    file = request.files.get("file")

    if not file:
        return jsonify({"error": "No file provided"}), 400

    if not file.filename.lower().endswith((".ppt", ".pptx", ".pdf")):
        return jsonify({"error": "Only PDF or PPT files allowed"}), 400

    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename)[1].lower()

    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
    file.save(file_path)

    return jsonify({
        "file_id": file_id,
        "file_path": file_path,
        "file_type": ext
    })


# =========================
# 2️⃣ Process → Slides + Audio
# =========================
@upload_bp.route("/process-ppt", methods=["POST"])
@require_auth
def process_ppt():
    data = request.get_json(silent=True) or {}
    file_path = data.get("file_path")
    slide_count = int(data.get("slide_count", 5))
    role = data.get("role", "teacher")
    lang = data.get("lang", "en")

    if not file_path or not os.path.exists(file_path):
        return jsonify(
            {
                "error": "File not found",
                "detail": "Uploaded file path is missing or inaccessible.",
                "file_path": file_path,
            }
        ), 400

    ext = os.path.splitext(file_path)[1].lower()
    session_id = str(uuid.uuid4())

    # ✅ Extract full document text
    if ext == ".pdf":
        full_text = extract_pdf_text(file_path)
    else:
        full_text = extract_ppt_text(file_path)

    if not full_text.strip():
        return jsonify(
            {
                "error": "No text extracted",
                "detail": "No readable text was found. For scanned PDFs, install Tesseract OCR and try again.",
                "file_type": ext,
                "file_path": file_path,
            }
        ), 400

    # ✅ AI summarization into EXACT N slides
    slides = summarize_into_slides(full_text, slide_count, role=role)

    # 🔊 Audio generation
    session_output_dir = os.path.join(OUTPUT_DIR, session_id)
    os.makedirs(session_output_dir, exist_ok=True)

    generate_slide_audio(slides, session_id, role, lang)

    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO presentations (session_id, user_id, source_file_path, slides_json)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (session_id)
                    DO UPDATE SET
                      slides_json = EXCLUDED.slides_json,
                      source_file_path = EXCLUDED.source_file_path,
                      updated_at = NOW()
                    """,
                    (session_id, g.current_user["id"], file_path, to_db_json(slides)),
                )
    finally:
        conn.close()

    SESSION_STATE[session_id] = {
        "slides": slides,
        "current_slide": 0,
        "mode": "PRESENTING",
        "role": role,
        "lang": lang
    }

    return jsonify({
        "session_id": session_id,
        "slides": slides
    })


@upload_bp.route("/regenerate-audio", methods=["POST"])
@require_auth
def regenerate_audio():
    session_id = request.json.get("session_id")
    role = request.json.get("role", "teacher")
    lang = request.json.get("lang", "en")
    team_members = request.json.get("team_members", [])

    if not session_id or session_id not in SESSION_STATE:
        return jsonify({"error": "Invalid session_id"}), 404

    slides = SESSION_STATE[session_id]["slides"]
    if team_members and not _has_team_slide(slides):
        slides.insert(0, _make_team_slide(team_members))
    generate_slide_audio(slides, session_id, role, lang)

    SESSION_STATE[session_id]["role"] = role
    SESSION_STATE[session_id]["lang"] = lang
    SESSION_STATE[session_id]["slides"] = slides

    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE presentations
                    SET slides_json = %s, updated_at = NOW()
                    WHERE session_id = %s AND user_id = %s
                    """,
                    (to_db_json(slides), session_id, g.current_user["id"]),
                )
    finally:
        conn.close()

    return jsonify({
        "session_id": session_id,
        "slides": slides
    })
