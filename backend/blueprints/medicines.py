from flask import Blueprint, request, jsonify, g

from db import query, transaction, to_jsonable
from auth_utils import require_auth, require_owner

bp = Blueprint("medicines", __name__)

# Stock is always computed from batches, never stored on medicines directly —
# that's what keeps it impossible for the displayed count to drift from reality.
MEDICINE_WITH_STOCK_SQL = """
  SELECT
    m.id, m.brand_name, m.generic_name, m.manufacturer, m.unit, m.units_per_pack,
    m.selling_price, m.reorder_level, c.name AS category,
    COALESCE(SUM(b.quantity_remaining), 0) AS stock,
    MIN(b.expiry_date) FILTER (WHERE b.quantity_remaining > 0) AS nearest_expiry
  FROM medicines m
  LEFT JOIN categories c ON c.id = m.category_id
  LEFT JOIN batches b ON b.medicine_id = m.id
  GROUP BY m.id, c.name
  ORDER BY m.brand_name
"""


@bp.get("")
@require_auth
def list_medicines():
    rows = query(MEDICINE_WITH_STOCK_SQL)
    return jsonify(to_jsonable(rows))


@bp.post("")
@require_auth
@require_owner
def create_medicine():
    body = request.get_json(silent=True) or {}
    brand_name = body.get("brandName")
    generic_name = body.get("genericName")
    manufacturer = body.get("manufacturer")
    category = body.get("category")
    unit = body.get("unit") or "unit"
    units_per_pack = int(body.get("unitsPerPack") or 1)
    selling_price = body.get("sellingPrice")
    reorder_level = body.get("reorderLevel")
    supplier_id = body.get("supplierId") or None
    # These two arrive in PACK terms from the form (e.g. "cost per box",
    # "boxes received") and get converted to dispense-unit terms below —
    # everything stored in batches/stock_movements stays in the same unit
    # the medicine is actually sold in, same as before this feature existed.
    cost_price_per_pack = float(body.get("costPrice") or 0)
    packs_received = body.get("quantityReceived")
    expiry = body.get("expiry") or None

    if not brand_name or not generic_name or not selling_price or not reorder_level:
        return jsonify({"error": "brandName, genericName, sellingPrice and reorderLevel are required"}), 400
    if units_per_pack < 1:
        return jsonify({"error": "unitsPerPack must be at least 1"}), 400

    try:
        with transaction() as cur:
            category_id = None
            if category:
                cur.execute("SELECT id FROM categories WHERE name = %s", [category])
                found = cur.fetchone()
                if found:
                    category_id = found["id"]
                else:
                    cur.execute("INSERT INTO categories (name) VALUES (%s) RETURNING id", [category])
                    category_id = cur.fetchone()["id"]

            cur.execute(
                """INSERT INTO medicines
                   (brand_name, generic_name, manufacturer, category_id, unit, units_per_pack,
                    selling_price, reorder_level, created_by)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                [
                    brand_name, generic_name, manufacturer, category_id, unit, units_per_pack,
                    selling_price, reorder_level, g.user["id"],
                ],
            )
            medicine_id = cur.fetchone()["id"]

            if packs_received and float(packs_received) > 0:
                units_received = round(float(packs_received) * units_per_pack)
                cost_price_per_unit = round(cost_price_per_pack / units_per_pack, 2)

                cur.execute(
                    """INSERT INTO batches
                       (medicine_id, supplier_id, quantity_received, quantity_remaining, cost_price, expiry_date, received_by)
                       VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                    [medicine_id, supplier_id, units_received, units_received, cost_price_per_unit, expiry, g.user["id"]],
                )
                batch_id = cur.fetchone()["id"]
                cur.execute(
                    """INSERT INTO stock_movements (medicine_id, batch_id, type, quantity, performed_by, note)
                       VALUES (%s, %s, 'received', %s, %s, 'Initial stock on creation')""",
                    [medicine_id, batch_id, units_received, g.user["id"]],
                )

        return jsonify({"id": medicine_id}), 201
    except Exception as err:
        print("create_medicine failed:", err)
        return jsonify({"error": "Failed to create medicine"}), 500


@bp.post("/<int:medicine_id>/batches")
@require_auth
def restock_medicine(medicine_id):
    body = request.get_json(silent=True) or {}
    supplier_id = body.get("supplierId") or None
    cost_price_per_pack = float(body.get("costPrice") or 0)
    packs = body.get("quantity")
    expiry = body.get("expiry")

    if not packs or not expiry:
        return jsonify({"error": "quantity and expiry are required"}), 400

    medicine_rows = query("SELECT units_per_pack FROM medicines WHERE id = %s", [medicine_id])
    if not medicine_rows:
        return jsonify({"error": "Medicine not found"}), 404
    units_per_pack = medicine_rows[0]["units_per_pack"]

    units = round(float(packs) * units_per_pack)
    cost_price_per_unit = round(cost_price_per_pack / units_per_pack, 2)

    try:
        with transaction() as cur:
            cur.execute(
                """INSERT INTO batches
                   (medicine_id, supplier_id, quantity_received, quantity_remaining, cost_price, expiry_date, received_by)
                   VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                [medicine_id, supplier_id, units, units, cost_price_per_unit, expiry, g.user["id"]],
            )
            batch_id = cur.fetchone()["id"]
            cur.execute(
                """INSERT INTO stock_movements (medicine_id, batch_id, type, quantity, performed_by, note)
                   VALUES (%s, %s, 'received', %s, %s, 'Restock')""",
                [medicine_id, batch_id, units, g.user["id"]],
            )
        return jsonify({"ok": True, "unitsAdded": units}), 201
    except Exception as err:
        print("restock_medicine failed:", err)
        return jsonify({"error": "Failed to restock medicine"}), 500
