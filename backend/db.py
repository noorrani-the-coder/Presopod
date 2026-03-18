import os
import sqlite3

try:
    import psycopg2
    from psycopg2 import IntegrityError as PostgresIntegrityError
except Exception:  # pragma: no cover
    psycopg2 = None
    PostgresIntegrityError = Exception


IntegrityError = (sqlite3.IntegrityError, PostgresIntegrityError)
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", os.path.join("data", "slidecast.db"))


def to_db_json(value):
    # Compatible helper so routes do not need psycopg2.extras.Json.
    return json_dumps(value)


def json_dumps(value):
    import json

    return json.dumps(value)


def _is_sqlite_url(database_url):
    if not database_url:
        return True
    return database_url.startswith("sqlite:///") or database_url.startswith("sqlite://")


def _resolve_sqlite_path(database_url):
    if not database_url:
        return SQLITE_DB_PATH
    if database_url.startswith("sqlite:///"):
        return database_url[len("sqlite:///") :]
    if database_url.startswith("sqlite://"):
        return database_url[len("sqlite://") :]
    return SQLITE_DB_PATH


def _to_sqlite_query(query):
    return (
        query.replace("%s", "?")
        .replace(" NOW()", " CURRENT_TIMESTAMP")
        .replace("NOW()", "CURRENT_TIMESTAMP")
        .replace("JSONB", "TEXT")
        .replace("UUID", "TEXT")
        .replace("TIMESTAMPTZ", "TIMESTAMP")
        .replace("SERIAL PRIMARY KEY", "INTEGER PRIMARY KEY AUTOINCREMENT")
    )


class CursorAdapter:
    def __init__(self, cursor, backend):
        self._cursor = cursor
        self._backend = backend

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        self.close()
        return False

    def execute(self, query, params=None):
        if self._backend == "sqlite":
            query = _to_sqlite_query(query)
        if params is None:
            return self._cursor.execute(query)
        return self._cursor.execute(query, params)

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()

    def close(self):
        self._cursor.close()


class ConnectionAdapter:
    def __init__(self, conn, backend):
        self._conn = conn
        self.backend = backend

    def __enter__(self):
        self._conn.__enter__()
        return self

    def __exit__(self, exc_type, exc, tb):
        return self._conn.__exit__(exc_type, exc, tb)

    def cursor(self):
        return CursorAdapter(self._conn.cursor(), self.backend)

    def close(self):
        self._conn.close()


def _open_sqlite(sqlite_path):
    os.makedirs(os.path.dirname(sqlite_path) or ".", exist_ok=True)
    conn = sqlite3.connect(sqlite_path, check_same_thread=False)
    conn.execute("PRAGMA foreign_keys = ON")
    return ConnectionAdapter(conn, "sqlite")


def get_db_connection():
    database_url = os.getenv("DATABASE_URL")

    if _is_sqlite_url(database_url):
        return _open_sqlite(_resolve_sqlite_path(database_url))

    if psycopg2 is None:
        # psycopg2 not installed: still run app with local SQLite.
        return _open_sqlite(SQLITE_DB_PATH)

    try:
        return ConnectionAdapter(psycopg2.connect(database_url), "postgres")
    except Exception:
        # Postgres unavailable: fallback to SQLite for local/offline runs.
        return _open_sqlite(SQLITE_DB_PATH)


def init_db():
    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        full_name VARCHAR(120) NOT NULL,
                        email VARCHAR(255) UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                    """
                )
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS presentations (
                        id SERIAL PRIMARY KEY,
                        session_id UUID UNIQUE NOT NULL,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        source_file_path TEXT,
                        slides_json JSONB NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                    """
                )
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS notes (
                        id SERIAL PRIMARY KEY,
                        presentation_id INTEGER NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        slide_index INTEGER NOT NULL,
                        note_text TEXT NOT NULL DEFAULT '',
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        UNIQUE (presentation_id, slide_index)
                    );
                    """
                )
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS presentation_summaries (
                        id SERIAL PRIMARY KEY,
                        presentation_id INTEGER UNIQUE NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        summary_text TEXT NOT NULL DEFAULT '',
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                    """
                )
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS note_items (
                        id SERIAL PRIMARY KEY,
                        presentation_id INTEGER NOT NULL REFERENCES presentations(id) ON DELETE CASCADE,
                        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        slide_index INTEGER NOT NULL,
                        note_order INTEGER NOT NULL,
                        note_label VARCHAR(32) NOT NULL,
                        note_text TEXT NOT NULL DEFAULT '',
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    );
                    """
                )
    finally:
        conn.close()
