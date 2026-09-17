from flask import Blueprint, request, jsonify

from db import query, to_jsonable
from auth_utils import require_auth, require_owner

bp = Blueprint("catalog", __name__)


@bp.get("/categories")
@require_auth
def list_categories():
    rows = query("SELECT id, name FROM categories ORDER BY name")
    return jsonify(to_jsonable(rows))


@bp.get("/suppliers")
@require_auth
@require_owner
def list_suppliers():
    rows = query(
        """SELECT s.id, s.name, s.contact_person, s.phone, s.address,
             COUNT(DISTINCT b.medicine_id) AS medicines_supplied
           FROM suppliers s
           LEFT JOIN batches b ON b.supplier_id = s.id
           GROUP BY s.id
           ORDER BY s.name"""
    )
    return jsonify(to_jsonable(rows))


@bp.post("/suppliers")
@require_auth
@require_owner
def create_supplier():
    body = request.get_json(silent=True) or {}
    name = body.get("name")
    if not name:
        return jsonify({"error": "name is required"}), 400

    rows = query(
        "INSERT INTO suppliers (name, contact_person, phone, address) VALUES (%s, %s, %s, %s) RETURNING id",
        [name, body.get("contactPerson"), body.get("phone"), body.get("address")],
    )
    return jsonify({"id": rows[0]["id"]}), 201


@bp.delete("/suppliers/<int:supplier_id>")
@require_auth
@require_owner
def delete_supplier(supplier_id):
    existing = query("SELECT id FROM suppliers WHERE id = %s", [supplier_id])
    if not existing:
        return jsonify({"error": "Supplier not found"}), 404

    in_use = query(
        "SELECT id FROM batches WHERE supplier_id = %s LIMIT 1", [supplier_id]
    )
    if in_use:
        return (
            jsonify(
                {
                    "error": "This supplier has stock batches on record and can't be deleted, "
                    "to keep that history intact."
                }
            ),
            409,
        )

    query("DELETE FROM suppliers WHERE id = %s", [supplier_id])
    return jsonify({"ok": True})
