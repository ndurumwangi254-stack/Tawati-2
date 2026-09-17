import os
import datetime
from decimal import Decimal
from contextlib import contextmanager

from psycopg_pool import ConnectionPool
from psycopg.rows import dict_row

_pool = None


def init_pool():
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=os.environ["DATABASE_URL"],
            min_size=1,
            max_size=10,
            open=True,
        )
    return _pool


def to_jsonable(value):
    """Recursively convert psycopg result values (Decimal, date, datetime)
    into things Flask's jsonify can actually serialize."""
    if isinstance(value, list):
        return [to_jsonable(v) for v in value]
    if isinstance(value, dict):
        return {k: to_jsonable(v) for k, v in value.items()}
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime.date, datetime.datetime)):
        return value.isoformat()
    return value


def query(sql, params=None):
    """Single-statement query, auto-committed. Returns a list of dict rows,
    or None for statements with no result set (e.g. a bare UPDATE)."""
    with init_pool().connection() as conn:
        conn.autocommit = True
        conn.row_factory = dict_row
        with conn.cursor() as cur:
            cur.execute(sql, params or [])
            if cur.description is None:
                return None
            return cur.fetchall()


@contextmanager
def transaction():
    """Multi-statement transaction. Yields a cursor; commits on success,
    rolls back on any exception. The connection always returns to the
    pool via the `with` block below, regardless of outcome."""
    with init_pool().connection() as conn:
        conn.autocommit = False
        conn.row_factory = dict_row
        try:
            with conn.cursor() as cur:
                yield cur
            conn.commit()
        except Exception:
            conn.rollback()
            raise
