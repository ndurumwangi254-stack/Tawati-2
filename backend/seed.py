# Populates a freshly-created database with starter data.
# Run with: python seed.py   (after `psql -f schema.sql` has created the tables)

import os
import bcrypt
from dotenv import load_dotenv

load_dotenv()

from db import transaction  # noqa: E402  (import after load_dotenv on purpose)


def seed():
    with transaction() as cur:
        cur.execute(
            """INSERT INTO shop_settings (id, name, phone, address)
               VALUES (1, 'Tawati Chemist', '0722 000 000', '')
               ON CONFLICT (id) DO NOTHING"""
        )

        owner_hash = bcrypt.hashpw(b"owner123", bcrypt.gensalt(10)).decode("utf-8")
        worker_hash = bcrypt.hashpw(b"worker123", bcrypt.gensalt(10)).decode("utf-8")

        cur.execute(
            """INSERT INTO users (name, username, password_hash, role)
               VALUES ('Owner', 'owner', %s, 'owner'), ('Jane', 'jane', %s, 'worker')
               RETURNING id, username""",
            [owner_hash, worker_hash],
        )
        user_rows = cur.fetchall()
        owner_id = next(u["id"] for u in user_rows if u["username"] == "owner")

        category_names = ["Antibiotic", "Painkiller", "Syrup", "Supplement", "Antimalarial"]
        cur.execute(
            f"""INSERT INTO categories (name) VALUES {", ".join(["(%s)"] * len(category_names))}
                RETURNING id, name""",
            category_names,
        )
        category_rows = cur.fetchall()
        category_id = {c["name"]: c["id"] for c in category_rows}

        cur.execute(
            """INSERT INTO suppliers (name, contact_person, phone) VALUES
                 ('MedSupply Ltd', 'John K.', '0722 111 222'),
                 ('PharmaLink Kenya', 'Grace M.', '0733 444 555')
               RETURNING id, name"""
        )
        supplier_rows = cur.fetchall()
        supplier_id = {s["name"]: s["id"] for s in supplier_rows}

        medicines = [
            dict(brand="Anamol", generic="Paracetamol", mfr="Cosmos Pharma", cat="Painkiller",
                 unit="Tablet", price=20, reorder=20, supplier="MedSupply Ltd", cost=12, qty=12, expiry="2027-03-01"),
            dict(brand="Cetamol", generic="Paracetamol", mfr="Beta Healthcare", cat="Painkiller",
                 unit="Tablet", price=18, reorder=20, supplier="PharmaLink Kenya", cost=10, qty=340, expiry="2028-01-15"),
            dict(brand="Amoxil", generic="Amoxicillin", mfr="GSK", cat="Antibiotic",
                 unit="Tablet", price=20, reorder=20, supplier="MedSupply Ltd", cost=13, qty=12, expiry="2027-03-10"),
            dict(brand="Tuscof", generic="Cough Syrup", mfr="Cosmos Pharma", cat="Syrup",
                 unit="Bottle", price=150, reorder=15, supplier="PharmaLink Kenya", cost=100, qty=5, expiry="2026-10-01"),
            dict(brand="Brufen", generic="Ibuprofen", mfr="Abbott", cat="Painkiller",
                 unit="Tablet", price=15, reorder=25, supplier="MedSupply Ltd", cost=9, qty=0, expiry="2027-06-01"),
            dict(brand="Glucophage", generic="Metformin", mfr="Merck", cat="Supplement",
                 unit="Tablet", price=10, reorder=30, supplier="PharmaLink Kenya", cost=6, qty=210, expiry="2027-11-01"),
        ]

        for m in medicines:
            cur.execute(
                """INSERT INTO medicines
                   (brand_name, generic_name, manufacturer, category_id, unit, selling_price, reorder_level, created_by)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                [m["brand"], m["generic"], m["mfr"], category_id[m["cat"]], m["unit"], m["price"], m["reorder"], owner_id],
            )
            medicine_id = cur.fetchone()["id"]

            cur.execute(
                """INSERT INTO batches
                   (medicine_id, supplier_id, batch_number, quantity_received, quantity_remaining, cost_price, expiry_date, received_by)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
                [medicine_id, supplier_id[m["supplier"]], f"B-{medicine_id}-001", m["qty"], m["qty"], m["cost"], m["expiry"], owner_id],
            )
            batch_id = cur.fetchone()["id"]

            if m["qty"] > 0:
                cur.execute(
                    """INSERT INTO stock_movements (medicine_id, batch_id, type, quantity, performed_by, note)
                       VALUES (%s, %s, 'received', %s, %s, 'Initial stock')""",
                    [medicine_id, batch_id, m["qty"], owner_id],
                )

        cur.execute(
            """INSERT INTO patients (name, phone, is_chronic, notes) VALUES
                 ('Mary Wanjiru', '0722 000 111', true, 'Prefers generic brand'),
                 ('James Otieno', '0733 222 333', false, '')
               RETURNING id, name"""
        )
        patient_rows = cur.fetchall()
        mary_id = next(p["id"] for p in patient_rows if p["name"] == "Mary Wanjiru")

        cur.execute(
            """INSERT INTO patient_medicines (patient_id, generic_name, typical_interval_days, last_purchased_at)
               VALUES (%s, 'Metformin', 30, '2026-08-09')""",
            [mary_id],
        )

    print("Seed complete.")
    print('Login with username "owner" / password "owner123", or "jane" / "worker123".')


if __name__ == "__main__":
    import sys

    try:
        seed()
    except Exception as err:
        print("Seed failed, rolled back:", err)
        sys.exit(1)
