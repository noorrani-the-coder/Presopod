import os
from flask import Blueprint, send_from_directory

audio_bp = Blueprint("audio", __name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_BASE = os.path.join(BASE_DIR, "data", "output")

@audio_bp.route("/data/output/<session_id>/<filename>")
def serve_audio(session_id, filename):
    directory = os.path.join(OUTPUT_BASE, session_id)
    return send_from_directory(directory, filename)
