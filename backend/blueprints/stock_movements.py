from flask import Blueprint, request, jsonify

from db import query, to_jsonable
from auth_utils import require_auth, require_owner

bp = Blueprint("stock_movements", __name__)


@bp.get("")
@require_auth
@require_owner
def list_stock_movements():
    movement_type = request.args.get("type")
    params = []
    where = ""
    if movement_type and movement_type != "All":
        params.append(movement_type.lower())
        where = "WHERE sm.type = %s"

    rows = query(
        f"""SELECT sm.id, sm.created_at, sm.type, sm.quantity, sm.note,
               m.brand_name AS medicine, u.name AS performed_by
            FROM stock_movements sm
            JOIN medicines m ON m.id = sm.medicine_id
            LEFT JOIN users u ON u.id = sm.performed_by
            {where}
            ORDER BY sm.created_at DESC
            LIMIT 200""",
        params,
    )
    return jsonify(to_jsonable(rows))
