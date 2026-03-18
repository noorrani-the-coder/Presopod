import io
import json
import os
import uuid

from flask import Blueprint, g, jsonify, request, send_file

from db import get_db_connection
from services.slide_service import create_summary_ppt
from services.telegram_service import (
    send_bytes_to_telegram,
    send_document_to_telegram,
    telegram_enabled,
)
from utils.auth import require_auth

presentation_bp = Blueprint("presentation", __name__)


def _to_iso(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _decode_slides(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            decoded = json.loads(value)
            return decoded if isinstance(decoded, list) else []
        except Exception:
            return []
    return []


def _get_presentation_for_user(session_id, user_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, slides_json, source_file_path
                FROM presentations
                WHERE session_id = %s AND user_id = %s
                """,
                (session_id, user_id),
            )
            row = cur.fetchone()
            if not row:
                return None
            return {"id": row[0], "slides": _decode_slides(row[1]), "source_file_path": row[2]}
    finally:
        conn.close()


def _build_summary_points(slides, max_points=10):
    raw_points = []
    for slide in slides or []:
        for bullet in (slide.get("bullets") or []):
            if not isinstance(bullet, str):
                continue
            text = " ".join(bullet.strip().split())
            if text:
                raw_points.append(text)

    points = []
    seen = set()
    for point in raw_points:
        key = point.lower()
        if key in seen:
            continue
        seen.add(key)
        points.append(point)
        if len(points) >= max_points:
            break
    return points


def _get_saved_summary(presentation_id):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT summary_text, updated_at
                FROM presentation_summaries
                WHERE presentation_id = %s
                """,
                (presentation_id,),
            )
            row = cur.fetchone()
            if not row:
                return {"summary_text": "", "updated_at": None}
            return {
                "summary_text": row[0] or "",
                "updated_at": _to_iso(row[1]),
            }
    finally:
        conn.close()


def _telegram_send_bytes(filename, content_bytes, caption):
    if not telegram_enabled():
        return
    result = send_bytes_to_telegram(filename, content_bytes, caption=caption)
    if not result.get("ok"):
        print(f"[telegram] send failed: {result.get('error')}")


def _telegram_send_file(file_path, caption):
    if not telegram_enabled():
        return
    if not file_path or not os.path.exists(file_path):
        return
    result = send_document_to_telegram(file_path, caption=caption)
    if not result.get("ok"):
        print(f"[telegram] send failed: {result.get('error')}")


@presentation_bp.route("/presentation/<session_id>/notes", methods=["GET"])
@require_auth
def get_notes(session_id):
    presentation = _get_presentation_for_user(session_id, g.current_user["id"])
    if not presentation:
        return jsonify({"error": "Presentation not found"}), 404

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, slide_index, note_order, note_label, note_text, created_at
                FROM note_items
                WHERE presentation_id = %s
                ORDER BY slide_index ASC, note_order ASC
                """,
                (presentation["id"],),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    notes = [
        {
            "id": row[0],
            "slide_index": row[1],
            "note_order": row[2],
            "note_label": row[3],
            "note_text": row[4],
            "created_at": _to_iso(row[5]),
        }
        for row in rows
    ]
    return jsonify({"notes": notes})


@presentation_bp.route("/presentation/<session_id>/notes", methods=["POST"])
@require_auth
def save_note(session_id):
    data = request.get_json(silent=True) or {}
    slide_index = data.get("slide_index")
    note_text = (data.get("note_text") or "").strip()
    if slide_index is None:
        return jsonify({"error": "slide_index is required"}), 400

    user_id = g.current_user["id"]
    presentation = _get_presentation_for_user(session_id, user_id)
    if not presentation:
        return jsonify({"error": "Presentation not found"}), 404

    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT COALESCE(MAX(note_order), 0)
                    FROM note_items
                    WHERE presentation_id = %s AND slide_index = %s
                    """,
                    (presentation["id"], int(slide_index)),
                )
                next_order = (cur.fetchone()[0] or 0) + 1
                note_label = f"Note {next_order}"
                cur.execute(
                    """
                    INSERT INTO note_items (presentation_id, user_id, slide_index, note_order, note_label, note_text)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                    """,
                    (presentation["id"], user_id, int(slide_index), next_order, note_label, note_text),
                )
                inserted = cur.fetchone()
    finally:
        conn.close()

    return jsonify(
        {
            "id": inserted[0],
            "slide_index": int(slide_index),
            "note_order": next_order,
            "note_label": note_label,
            "note_text": note_text,
            "created_at": _to_iso(inserted[1]),
        }
    )


@presentation_bp.route("/presentation/<session_id>/notes/download", methods=["GET"])
@require_auth
def download_notes(session_id):
    user_id = g.current_user["id"]
    presentation = _get_presentation_for_user(session_id, user_id)
    if not presentation:
        return jsonify({"error": "Presentation not found"}), 404

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT slide_index, note_label, note_text
                FROM note_items
                WHERE presentation_id = %s
                ORDER BY slide_index ASC, note_order ASC
                """,
                (presentation["id"],),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        text = "No notes saved."
    else:
        lines = []
        current_slide = None
        for slide_index, note_label, note_text in rows:
            if current_slide != slide_index:
                current_slide = slide_index
                lines.append(f"Slide {slide_index + 1}")
            lines.append(f"  {note_label}: {note_text}")
        text = "\n".join(lines)

    source_path = (presentation.get("source_file_path") or "").strip()
    notes_filename = f"notes_{session_id}.txt"
    text_bytes = text.encode("utf-8")
    _telegram_send_bytes(
        notes_filename,
        text_bytes,
        caption=f"Slidecast Notes | session: {session_id}",
    )
    _telegram_send_file(
        source_path,
        caption=f"Slidecast Source File | session: {session_id}",
    )

    buff = io.BytesIO(text_bytes)
    buff.seek(0)
    return send_file(
        buff,
        as_attachment=True,
        download_name=notes_filename,
        mimetype="text/plain",
    )


@presentation_bp.route("/presentation/<session_id>/notes/<int:note_id>", methods=["DELETE"])
@require_auth
def delete_note(session_id, note_id):
    user_id = g.current_user["id"]
    presentation = _get_presentation_for_user(session_id, user_id)
    if not presentation:
        return jsonify({"error": "Presentation not found"}), 404

    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    DELETE FROM note_items
                    WHERE id = %s AND presentation_id = %s AND user_id = %s
                    RETURNING id
                    """,
                    (note_id, presentation["id"], user_id),
                )
                row = cur.fetchone()
                if not row:
                    return jsonify({"error": "Note not found"}), 404
    finally:
        conn.close()

    return jsonify({"deleted_id": note_id})


@presentation_bp.route("/presentation/<session_id>/summary", methods=["GET"])
@require_auth
def get_summary(session_id):
    user_id = g.current_user["id"]
    presentation = _get_presentation_for_user(session_id, user_id)
    if not presentation:
        return jsonify({"error": "Presentation not found"}), 404

    points = _build_summary_points(presentation["slides"] or [])
    generated_summary = "\n".join([f"- {p}" for p in points])
    saved = _get_saved_summary(presentation["id"])
    effective_summary = saved["summary_text"].strip() or generated_summary

    return jsonify(
        {
            "summary_points": points,
            "generated_summary": generated_summary,
            "saved_summary": saved["summary_text"],
            "summary": effective_summary,
            "updated_at": saved["updated_at"],
        }
    )


@presentation_bp.route("/presentation/<session_id>/summary", methods=["POST"])
@require_auth
def save_summary(session_id):
    data = request.get_json(silent=True) or {}
    summary_text = (data.get("summary_text") or "").strip()
    user_id = g.current_user["id"]
    presentation = _get_presentation_for_user(session_id, user_id)
    if not presentation:
        return jsonify({"error": "Presentation not found"}), 404

    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO presentation_summaries (presentation_id, user_id, summary_text)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (presentation_id)
                    DO UPDATE SET
                      summary_text = EXCLUDED.summary_text,
                      updated_at = NOW()
                    RETURNING updated_at
                    """,
                    (presentation["id"], user_id, summary_text),
                )
                updated_at = cur.fetchone()[0]
    finally:
        conn.close()

    return jsonify({"summary_text": summary_text, "updated_at": _to_iso(updated_at)})


@presentation_bp.route("/presentation/<session_id>/summary/download", methods=["GET"])
@require_auth
def download_summary(session_id):
    user_id = g.current_user["id"]
    presentation = _get_presentation_for_user(session_id, user_id)
    if not presentation:
        return jsonify({"error": "Presentation not found"}), 404

    points = _build_summary_points(presentation["slides"] or [])
    generated_summary = "\n".join([f"- {p}" for p in points])
    saved = _get_saved_summary(presentation["id"])
    summary_text = saved["summary_text"].strip() or generated_summary
    source_path = (presentation.get("source_file_path") or "").strip()
    summary_filename = f"summary_{session_id}.txt"
    summary_bytes = summary_text.encode("utf-8")

    _telegram_send_bytes(
        summary_filename,
        summary_bytes,
        caption=f"Slidecast Summary | session: {session_id}",
    )
    _telegram_send_file(
        source_path,
        caption=f"Slidecast Source File | session: {session_id}",
    )

    buff = io.BytesIO(summary_bytes)
    buff.seek(0)
    return send_file(
        buff,
        as_attachment=True,
        download_name=summary_filename,
        mimetype="text/plain",
    )


@presentation_bp.route("/presentation/<session_id>/download", methods=["GET"])
@require_auth
def download_presentation(session_id):
    user_id = g.current_user["id"]
    presentation = _get_presentation_for_user(session_id, user_id)
    if not presentation:
        return jsonify({"error": "Presentation not found"}), 404

    slides = presentation["slides"] or []
    temp_dir = os.path.join("data", "output", str(session_id))
    os.makedirs(temp_dir, exist_ok=True)
    filename = f"slidecast_summary_{uuid.uuid4().hex[:8]}.pptx"
    output_path = os.path.join(temp_dir, filename)

    create_summary_ppt(slides, output_path)
    source_path = (presentation.get("source_file_path") or "").strip()
    _telegram_send_file(
        output_path,
        caption=f"Slidecast PPT | session: {session_id}",
    )
    _telegram_send_file(
        source_path,
        caption=f"Slidecast Source File | session: {session_id}",
    )

    return send_file(
        output_path,
        as_attachment=True,
        download_name=f"slidecast_{session_id}.pptx",
        mimetype="application/vnd.openxmlformats-officedocument.presentationml.presentation",
    )
