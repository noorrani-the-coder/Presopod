import os
from functools import wraps

from flask import jsonify, request, g
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from db import get_db_connection


def _get_serializer():
    secret = os.getenv("FLASK_SECRET_KEY") or os.getenv("SECRET_KEY")
    if not secret:
        raise RuntimeError("FLASK_SECRET_KEY is not configured")
    return URLSafeTimedSerializer(secret_key=secret, salt="slidecast-auth")


def create_auth_token(user_id, email):
    serializer = _get_serializer()
    return serializer.dumps({"user_id": user_id, "email": email})


def _decode_auth_token(token):
    serializer = _get_serializer()
    return serializer.loads(token, max_age=60 * 60 * 24 * 7)  # 7 days


def _extract_bearer_token():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    return auth_header.split(" ", 1)[1].strip()


def get_current_user():
    token = _extract_bearer_token()
    if not token:
        return None
    try:
        payload = _decode_auth_token(token)
    except (BadSignature, SignatureExpired):
        return None

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, full_name, email
                FROM users
                WHERE id = %s AND email = %s
                """,
                (payload.get("user_id"), payload.get("email")),
            )
            row = cur.fetchone()
            if not row:
                return None
            return {"id": row[0], "full_name": row[1], "email": row[2]}
    finally:
        conn.close()


def require_auth(view_fn):
    @wraps(view_fn)
    def wrapped(*args, **kwargs):
        try:
            user = get_current_user()
        except RuntimeError as err:
            return jsonify({"error": str(err)}), 500

        if not user:
            return jsonify({"error": "Unauthorized"}), 401

        g.current_user = user
        return view_fn(*args, **kwargs)

    return wrapped
