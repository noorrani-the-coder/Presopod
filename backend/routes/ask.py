from flask import Blueprint, request, jsonify
from services.qa_service import answer_question
from utils.auth import require_auth
from voice.state_manager import SESSION_STATE

ask_bp = Blueprint("ask", __name__)

@ask_bp.route("/ask", methods=["POST"])
@require_auth
def ask():
    data = request.json
    session_id = data.get("session_id")
    question = data.get("question")

    session = SESSION_STATE.get(session_id)
    if not session:
        return jsonify({"error": "Invalid session"}), 404

    answer = answer_question(session["slides"], question)
    return jsonify({"answer": answer})
