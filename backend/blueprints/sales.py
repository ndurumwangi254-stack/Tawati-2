from flask import Blueprint, request, jsonify, g

from db import transaction, to_jsonable
from auth_utils import require_auth

bp = Blueprint("sales", __name__)


class SaleError(Exception):
    def __init__(self, message, status):
        super().__init__(message)
        self.message = message
        self.status = status


# Creates a sale: allocates each medicine line across batches oldest-expiry-
# first (FEFO), decrements product lines as a flat stock count, writes a
# stock_movements row for every line touched, and — if a patient is
# attached — updates their refill tracking. Everything happens in one
# transaction so a sale is never left half-applied. A cart can mix medicine
# and shop-item lines in the same sale; each item carries either a
# medicineId or a productId, never both.
@bp.post("")
@require_auth
def create_sale():
    body = request.get_json(silent=True) or {}
    items = body.get("items")
    payment_method = body.get("paymentMethod")
    patient_id = body.get("patientId") or None

    if not isinstance(items, list) or len(items) == 0:
        return jsonify({"error": "items must be a non-empty array"}), 400
    if payment_method not in ("cash", "mpesa"):
        return jsonify({"error": 'paymentMethod must be "cash" or "mpesa"'}), 400

    try:
        with transaction() as cur:
            total_amount = 0
            total_cost = 0
            medicine_sale_items = []
            product_sale_items = []
            generic_names_dispensed = set()

            for item in items:
                medicine_id = item.get("medicineId")
                product_id = item.get("productId")
                quantity = item.get("quantity")

                if bool(medicine_id) == bool(product_id):
                    raise SaleError("Each item needs exactly one of medicineId or productId", 400)
                if not quantity or quantity <= 0:
                    raise SaleError("Each item needs a positive quantity", 400)

                if medicine_id:
                    cur.execute(
                        "SELECT id, selling_price, generic_name FROM medicines WHERE id = %s",
                        [medicine_id],
                    )
                    medicine = cur.fetchone()
                    if not medicine:
                        raise SaleError(f"Medicine {medicine_id} not found", 404)

                    # Lock the candidate batches so two simultaneous sales can't
                    # both read the same stock and both succeed.
                    cur.execute(
                        """SELECT id, quantity_remaining, cost_price FROM batches
                           WHERE medicine_id = %s AND quantity_remaining > 0
                           ORDER BY expiry_date ASC
                           FOR UPDATE""",
                        [medicine_id],
                    )
                    batches = cur.fetchall()

                    remaining_to_allocate = quantity
                    for batch in batches:
                        if remaining_to_allocate <= 0:
                            break
                        take_from_batch = min(batch["quantity_remaining"], remaining_to_allocate)

                        cur.execute(
                            "UPDATE batches SET quantity_remaining = quantity_remaining - %s WHERE id = %s",
                            [take_from_batch, batch["id"]],
                        )

                        subtotal = take_from_batch * float(medicine["selling_price"])
                        total_amount += subtotal
                        total_cost += take_from_batch * float(batch["cost_price"])

                        medicine_sale_items.append(
                            {
                                "medicineId": medicine_id,
                                "batchId": batch["id"],
                                "quantity": take_from_batch,
                                "unitPrice": medicine["selling_price"],
                                "unitCost": batch["cost_price"],
                                "subtotal": subtotal,
                            }
                        )

                        remaining_to_allocate -= take_from_batch

                    if remaining_to_allocate > 0:
                        # Not enough stock across any batch — fail the whole sale
                        # rather than partially dispense it.
                        raise SaleError(
                            f"Not enough stock for medicine {medicine_id} (short by {remaining_to_allocate})", 409
                        )

                    generic_names_dispensed.add(medicine["generic_name"])

                else:
                    # Product line — simple flat stock, no batches. Lock the row
                    # so two simultaneous sales can't both oversell it.
                    cur.execute(
                        "SELECT id, name, selling_price, cost_price, stock_quantity FROM products WHERE id = %s FOR UPDATE",
                        [product_id],
                    )
                    product = cur.fetchone()
                    if not product:
                        raise SaleError(f"Product {product_id} not found", 404)
                    if product["stock_quantity"] < quantity:
                        raise SaleError(
                            f"Not enough stock for {product['name']} (short by {quantity - product['stock_quantity']})",
                            409,
                        )

                    cur.execute(
                        "UPDATE products SET stock_quantity = stock_quantity - %s WHERE id = %s",
                        [quantity, product_id],
                    )

                    subtotal = quantity * float(product["selling_price"])
                    total_amount += subtotal
                    total_cost += quantity * float(product["cost_price"])

                    product_sale_items.append(
                        {
                            "productId": product_id,
                            "quantity": quantity,
                            "unitPrice": product["selling_price"],
                            "unitCost": product["cost_price"],
                            "subtotal": subtotal,
                        }
                    )

            cur.execute(
                """INSERT INTO sales (sold_by, patient_id, total_amount, total_cost, payment_method)
                   VALUES (%s, %s, %s, %s, %s) RETURNING id, created_at""",
                [g.user["id"], patient_id, total_amount, total_cost, payment_method],
            )
            sale = cur.fetchone()

            for line in medicine_sale_items:
                cur.execute(
                    """INSERT INTO sale_items (sale_id, medicine_id, batch_id, quantity, unit_price, unit_cost, subtotal)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    [sale["id"], line["medicineId"], line["batchId"], line["quantity"], line["unitPrice"], line["unitCost"], line["subtotal"]],
                )
                cur.execute(
                    """INSERT INTO stock_movements (medicine_id, batch_id, type, quantity, performed_by, note)
                       VALUES (%s, %s, 'sold', %s, %s, %s)""",
                    [line["medicineId"], line["batchId"], -line["quantity"], g.user["id"], f"Sale #{sale['id']}"],
                )

            for line in product_sale_items:
                cur.execute(
                    """INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, unit_cost, subtotal)
                       VALUES (%s, %s, %s, %s, %s, %s)""",
                    [sale["id"], line["productId"], line["quantity"], line["unitPrice"], line["unitCost"], line["subtotal"]],
                )
                cur.execute(
                    """INSERT INTO stock_movements (product_id, type, quantity, performed_by, note)
                       VALUES (%s, 'sold', %s, %s, %s)""",
                    [line["productId"], -line["quantity"], g.user["id"], f"Sale #{sale['id']}"],
                )

            if patient_id:
                for generic_name in generic_names_dispensed:
                    cur.execute(
                        """INSERT INTO patient_medicines (patient_id, generic_name, last_purchased_at)
                           VALUES (%s, %s, CURRENT_DATE)
                           ON CONFLICT (patient_id, generic_name)
                           DO UPDATE SET last_purchased_at = CURRENT_DATE""",
                        [patient_id, generic_name],
                    )

            result = {"id": sale["id"], "totalAmount": total_amount, "createdAt": sale["created_at"]}

        return jsonify(to_jsonable(result)), 201

    except SaleError as err:
        return jsonify({"error": err.message}), err.status
    except Exception as err:
        print("create_sale failed:", err)
        return jsonify({"error": "Sale failed, nothing was charged"}), 500
