from flask import Blueprint, request, jsonify

from db import query, to_jsonable
from auth_utils import require_auth

bp = Blueprint("patients", __name__)


@bp.get("")
@require_auth
def list_patients():
    rows = query("SELECT id, name, phone, is_chronic FROM patients ORDER BY name")
    return jsonify(to_jsonable(rows))


@bp.post("")
@require_auth
def create_patient():
    body = request.get_json(silent=True) or {}
    name = body.get("name")
    if not name:
        return jsonify({"error": "name is required"}), 400

    rows = query(
        "INSERT INTO patients (name, phone, is_chronic, notes) VALUES (%s, %s, %s, %s) RETURNING id",
        [name, body.get("phone"), bool(body.get("isChronic")), body.get("notes")],
    )
    return jsonify({"id": rows[0]["id"]}), 201


@bp.get("/<int:patient_id>")
@require_auth
def get_patient(patient_id):
    rows = query(
        "SELECT id, name, phone, is_chronic, notes FROM patients WHERE id = %s", [patient_id]
    )
    patient = rows[0] if rows else None
    if not patient:
        return jsonify({"error": "Patient not found"}), 404

    usual_medicines = query(
        """SELECT generic_name, typical_interval_days, last_purchased_at
           FROM patient_medicines WHERE patient_id = %s ORDER BY generic_name""",
        [patient_id],
    )

    history = query(
        """SELECT s.id AS sale_id, s.created_at, m.brand_name, m.generic_name, si.quantity, si.subtotal
           FROM sales s
           JOIN sale_items si ON si.sale_id = s.id
           JOIN medicines m ON m.id = si.medicine_id
           WHERE s.patient_id = %s
           ORDER BY s.created_at DESC
           LIMIT 50""",
        [patient_id],
    )

    result = {**patient, "usualMedicines": usual_medicines, "history": history}
    return jsonify(to_jsonable(result))
