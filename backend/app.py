from dotenv import load_dotenv
load_dotenv()

import os
from flask import Flask, request, send_from_directory
from flask_cors import CORS

# Blueprints
from db import init_db
from routes.auth import auth_bp
from routes.presentation import presentation_bp
from routes.upload import upload_bp
from routes.ask import ask_bp
from routes.audio import audio_bp


# ---------------- App Setup ----------------
def _get_allowed_origins():
    raw_origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


ALLOWED_ORIGINS = _get_allowed_origins()

app = Flask(__name__)

CORS(
    app,
    resources={r"/*": {"origins": ALLOWED_ORIGINS}},
    supports_credentials=True,
)

# ✅ Safe DB init (no crash)
try:
    init_db()
    print("✅ Database initialized")
except Exception as e:
    print("❌ DB ERROR:", e)


@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


# ---------------- Register Blueprints ----------------
app.register_blueprint(auth_bp)
app.register_blueprint(presentation_bp)
app.register_blueprint(upload_bp)
app.register_blueprint(ask_bp)
app.register_blueprint(audio_bp)


# ---------------- ROOT ROUTE ----------------
@app.route("/")
def home():
    return {"status": "Backend running 🚀"}


# ---------------- AUDIO STATIC SERVING ----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "data", "output")


@app.route("/data/output/<session_id>/<filename>")
def serve_audio(session_id, filename):
    return send_from_directory(
        os.path.join(OUTPUT_DIR, session_id),
        filename,
        mimetype="audio/mpeg"
    )


# ---------------- Run Server ----------------
if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
    )  