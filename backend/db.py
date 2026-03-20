import os
import sqlite3

try:
    import psycopg2
    from psycopg2 import IntegrityError as PostgresIntegrityError
except Exception:
    psycopg2 = None
    PostgresIntegrityError = Exception


IntegrityError = (sqlite3.IntegrityError, PostgresIntegrityError)

# ✅ FIXED PATH
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "/app/data/slidecast.db")


def json_dumps(value):
    import json
    return json.dumps(value)


def to_db_json(value):
    return json_dumps(value)


def _is_sqlite_url(database_url):
    if not database_url:
        return True
    return database_url.startswith("sqlite://")


def _resolve_sqlite_path(database_url):
    if not database_url:
        return SQLITE_DB_PATH
    if database_url.startswith("sqlite:///"):
        return database_url[len("sqlite:///"):]
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

    def execute(self, query, params=None):
        if self._backend == "sqlite":
            query = _to_sqlite_query(query)
        return self._cursor.execute(query, params or [])

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


# ✅ FIXED FUNCTION
def _open_sqlite(sqlite_path):
    db_dir = os.path.dirname(sqlite_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    conn = sqlite3.connect(sqlite_path, check_same_thread=False)
    conn.execute("PRAGMA foreign_keys = ON")
    return ConnectionAdapter(conn, "sqlite")


def get_db_connection():
    database_url = os.getenv("DATABASE_URL")

    if _is_sqlite_url(database_url):
        return _open_sqlite(_resolve_sqlite_path(database_url))

    if psycopg2 is None:
        return _open_sqlite(SQLITE_DB_PATH)

    try:
        return ConnectionAdapter(psycopg2.connect(database_url), "postgres")
    except Exception:
        return _open_sqlite(SQLITE_DB_PATH)


def init_db():
    conn = get_db_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    full_name VARCHAR(120),
                    email VARCHAR(255) UNIQUE,
                    password_hash TEXT
                );
                """)
    finally:
        conn.close() 