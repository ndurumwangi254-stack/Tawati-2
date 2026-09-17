from flask import Blueprint, jsonify

from db import query, to_jsonable
from auth_utils import require_auth

bp = Blueprint("alerts", __name__)


@bp.get("")
@require_auth
def get_alerts():
    low_stock = query(
        """SELECT m.id, m.brand_name, m.reorder_level, COALESCE(SUM(b.quantity_remaining), 0) AS stock
           FROM medicines m
           LEFT JOIN batches b ON b.medicine_id = m.id
           GROUP BY m.id
           HAVING COALESCE(SUM(b.quantity_remaining), 0) > 0
              AND COALESCE(SUM(b.quantity_remaining), 0) <= m.reorder_level
           ORDER BY stock ASC"""
    )

    out_of_stock = query(
        """SELECT m.id, m.brand_name
           FROM medicines m
           LEFT JOIN batches b ON b.medicine_id = m.id
           GROUP BY m.id
           HAVING COALESCE(SUM(b.quantity_remaining), 0) = 0
           ORDER BY m.brand_name"""
    )

    expiring_soon = query(
        """SELECT DISTINCT m.id, m.brand_name, b.expiry_date
           FROM medicines m
           JOIN batches b ON b.medicine_id = m.id
           WHERE b.quantity_remaining > 0
             AND b.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
           ORDER BY b.expiry_date ASC"""
    )

    expired = query(
        """SELECT DISTINCT m.id, m.brand_name, b.expiry_date
           FROM medicines m
           JOIN batches b ON b.medicine_id = m.id
           WHERE b.quantity_remaining > 0 AND b.expiry_date < CURRENT_DATE
           ORDER BY b.expiry_date ASC"""
    )

    result = {
        "lowStock": low_stock,
        "outOfStock": out_of_stock,
        "expiringSoon": expiring_soon,
        "expired": expired,
    }
    return jsonify(to_jsonable(result))
