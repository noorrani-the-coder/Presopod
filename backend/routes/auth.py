from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from db import IntegrityError, get_db_connection
from utils.auth import create_auth_token

auth_bp = Blueprint("auth", __name__)


def _validate_credentials(data, is_signup):
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    full_name = (data.get("full_name") or "").strip()

    if is_signup and not full_name:
        return None, None, None, "Full name is required"
    if not email:
        return None, None, None, "Email is required"
    if not password:
        return None, None, None, "Password is required"
    if is_signup and len(password) < 6:
        return None, None, None, "Password must be at least 6 characters"
    return full_name, email, password, None


@auth_bp.route("/auth/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    full_name, email, password, err = _validate_credentials(data, is_signup=True)
    if err:
        return jsonify({"error": err}), 400

    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO users (full_name, email, password_hash)
                    VALUES (%s, %s, %s)
                    RETURNING id, full_name, email
                    """,
                    (full_name, email, generate_password_hash(password)),
                )
                row = cur.fetchone()
    except IntegrityError:
        return jsonify({"error": "Email already registered"}), 409
    finally:
        conn.close()

    token = create_auth_token(row[0], row[2])
    return jsonify(
        {"token": token, "user": {"id": row[0], "full_name": row[1], "email": row[2]}}
    )


@auth_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    _, email, password, err = _validate_credentials(data, is_signup=False)
    if err:
        return jsonify({"error": err}), 400

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, full_name, email, password_hash
                FROM users
                WHERE email = %s
                """,
                (email,),
            )
            row = cur.fetchone()
    finally:
        conn.close()

    if not row or not check_password_hash(row[3], password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_auth_token(row[0], row[2])
    return jsonify(
        {"token": token, "user": {"id": row[0], "full_name": row[1], "email": row[2]}}
    )
