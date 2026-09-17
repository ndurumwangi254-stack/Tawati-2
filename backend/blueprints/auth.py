import bcrypt
from flask import Blueprint, request, jsonify, g

from db import query
from auth_utils import make_token, require_auth

bp = Blueprint("auth", __name__)


@bp.post("/login")
def login():
    body = request.get_json(silent=True) or {}
    username = body.get("username")
    password = body.get("password")
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    rows = query(
        "SELECT id, name, username, password_hash, role, status FROM users WHERE username = %s",
        [username.strip().lower()],
    )
    user = rows[0] if rows else None

    if not user or user["status"] != "active":
        return jsonify({"error": "Incorrect username or password"}), 401

    if not bcrypt.checkpw(password.encode("utf-8"), user["password_hash"].encode("utf-8")):
        return jsonify({"error": "Incorrect username or password"}), 401

    payload = {"id": user["id"], "name": user["name"], "username": user["username"], "role": user["role"]}
    token = make_token(payload)

    return jsonify({"token": token, "user": payload})


@bp.get("/me")
@require_auth
def me():
    return jsonify({"user": g.user})
