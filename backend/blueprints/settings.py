from flask import Blueprint, request, jsonify

from db import query, to_jsonable
from auth_utils import require_auth, require_owner

bp = Blueprint("settings", __name__)


@bp.get("")
@require_auth
@require_owner
def get_shop_settings():
    rows = query("SELECT name, phone, address FROM shop_settings WHERE id = 1")
    result = rows[0] if rows else {"name": "Tawati Chemist", "phone": "", "address": ""}
    return jsonify(to_jsonable(result))


@bp.put("")
@require_auth
@require_owner
def update_shop_settings():
    body = request.get_json(silent=True) or {}
    name = body.get("name")
    if not name:
        return jsonify({"error": "name is required"}), 400

    rows = query(
        """UPDATE shop_settings SET name = %s, phone = %s, address = %s WHERE id = 1
           RETURNING name, phone, address""",
        [name, body.get("phone"), body.get("address")],
    )
    return jsonify(to_jsonable(rows[0]))
