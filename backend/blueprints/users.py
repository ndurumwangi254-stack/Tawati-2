import bcrypt
from flask import Blueprint, request, jsonify

from db import query, to_jsonable
from auth_utils import require_auth, require_owner

bp = Blueprint("users", __name__)


@bp.get("")
@require_auth
@require_owner
def list_users():
    rows = query(
        "SELECT id, name, username, role, status, created_at FROM users ORDER BY role, name"
    )
    return jsonify(to_jsonable(rows))


@bp.post("")
@require_auth
@require_owner
def create_worker():
    body = request.get_json(silent=True) or {}
    name = body.get("name")
    username = body.get("username")
    password = body.get("password")
    if not name or not username or not password:
        return jsonify({"error": "name, username and password are required"}), 400

    username = username.strip().lower()
    existing = query("SELECT id FROM users WHERE username = %s", [username])
    if existing:
        return jsonify({"error": "That username is already taken"}), 409

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(10)).decode("utf-8")
    rows = query(
        "INSERT INTO users (name, username, password_hash, role) VALUES (%s, %s, %s, 'worker') RETURNING id",
        [name, username, password_hash],
    )
    return jsonify({"id": rows[0]["id"]}), 201


@bp.patch("/<int:user_id>/status")
@require_auth
@require_owner
def set_user_status(user_id):
    body = request.get_json(silent=True) or {}
    status = body.get("status")
    if status not in ("active", "deactivated"):
        return jsonify({"error": 'status must be "active" or "deactivated"'}), 400

    rows = query(
        "UPDATE users SET status = %s WHERE id = %s AND role = 'worker' RETURNING id, status",
        [status, user_id],
    )
    if not rows:
        return jsonify({"error": "Worker not found"}), 404
    return jsonify(to_jsonable(rows[0]))


@bp.post("/<int:user_id>/reset-password")
@require_auth
@require_owner
def reset_password(user_id):
    body = request.get_json(silent=True) or {}
    password = body.get("password")
    if not password or len(password) < 6:
        return jsonify({"error": "password must be at least 6 characters"}), 400

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(10)).decode("utf-8")
    rows = query(
        "UPDATE users SET password_hash = %s WHERE id = %s RETURNING id",
        [password_hash, user_id],
    )
    if not rows:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"ok": True})
