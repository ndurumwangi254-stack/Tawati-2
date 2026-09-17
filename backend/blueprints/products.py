from flask import Blueprint, request, jsonify, g

from db import query, transaction, to_jsonable
from auth_utils import require_auth, require_owner

bp = Blueprint("products", __name__)


@bp.get("")
@require_auth
def list_products():
    rows = query(
        """SELECT id, name, category, unit, units_per_pack, cost_price, selling_price,
               stock_quantity, reorder_level
           FROM products
           ORDER BY name"""
    )
    return jsonify(to_jsonable(rows))


@bp.post("")
@require_auth
@require_owner
def create_product():
    body = request.get_json(silent=True) or {}
    name = body.get("name")
    unit = body.get("unit") or "unit"
    units_per_pack = int(body.get("unitsPerPack") or 1)
    selling_price = body.get("sellingPrice")
    reorder_level = int(body.get("reorderLevel") or 0)
    category = body.get("category")
    # Same pack-to-unit convention as medicines: entered in pack terms,
    # stored in the unit the product is actually sold in.
    cost_price_per_pack = float(body.get("costPrice") or 0)
    packs_received = body.get("stockQuantity")

    if not name or not selling_price:
        return jsonify({"error": "name and sellingPrice are required"}), 400
    if units_per_pack < 1:
        return jsonify({"error": "unitsPerPack must be at least 1"}), 400

    units = round(float(packs_received) * units_per_pack) if packs_received else 0
    cost_price_per_unit = round(cost_price_per_pack / units_per_pack, 2) if cost_price_per_pack else 0

    try:
        with transaction() as cur:
            cur.execute(
                """INSERT INTO products
                   (name, category, unit, units_per_pack, cost_price, selling_price,
                    stock_quantity, reorder_level, created_by)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                [name, category, unit, units_per_pack, cost_price_per_unit, selling_price,
                 units, reorder_level, g.user["id"]],
            )
            product_id = cur.fetchone()["id"]

            if units > 0:
                cur.execute(
                    """INSERT INTO stock_movements (product_id, type, quantity, performed_by, note)
                       VALUES (%s, 'received', %s, %s, 'Initial stock on creation')""",
                    [product_id, units, g.user["id"]],
                )

        return jsonify({"id": product_id}), 201
    except Exception as err:
        print("create_product failed:", err)
        return jsonify({"error": "Failed to create product"}), 500


@bp.post("/<int:product_id>/restock")
@require_auth
def restock_product(product_id):
    body = request.get_json(silent=True) or {}
    packs = body.get("quantity")
    cost_price_per_pack = float(body.get("costPrice") or 0)

    if not packs or float(packs) <= 0:
        return jsonify({"error": "quantity is required"}), 400

    product_rows = query("SELECT units_per_pack, cost_price FROM products WHERE id = %s", [product_id])
    if not product_rows:
        return jsonify({"error": "Product not found"}), 404
    units_per_pack = product_rows[0]["units_per_pack"]

    units = round(float(packs) * units_per_pack)
    # Only overwrite the stored cost if a new one was actually given —
    # otherwise a quick restock without repricing keeps the last known cost.
    cost_price_per_unit = round(cost_price_per_pack / units_per_pack, 2) if cost_price_per_pack else None

    try:
        with transaction() as cur:
            if cost_price_per_unit is not None:
                cur.execute(
                    "UPDATE products SET stock_quantity = stock_quantity + %s, cost_price = %s WHERE id = %s",
                    [units, cost_price_per_unit, product_id],
                )
            else:
                cur.execute(
                    "UPDATE products SET stock_quantity = stock_quantity + %s WHERE id = %s",
                    [units, product_id],
                )
            cur.execute(
                """INSERT INTO stock_movements (product_id, type, quantity, performed_by, note)
                   VALUES (%s, 'received', %s, %s, 'Restock')""",
                [product_id, units, g.user["id"]],
            )
        return jsonify({"ok": True, "unitsAdded": units}), 201
    except Exception as err:
        print("restock_product failed:", err)
        return jsonify({"error": "Failed to restock product"}), 500
