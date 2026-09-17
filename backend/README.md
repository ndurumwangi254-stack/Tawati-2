# Backend

Flask API for Tawati Chemist, talking to PostgreSQL with raw SQL
(`psycopg (v3)` — no ORM), against the schema in `schema.sql`.

## Setup

```
cd backend
python3 -m venv venv
source venv/bin/activate        # on Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then fill in DATABASE_URL and JWT_SECRET
```

Create the database and load the schema:

```
createdb tawati_chemist
psql tawati_chemist -f schema.sql
```

If you already have a database from before this feature was added, run the
migrations instead of recreating everything (this preserves your existing
data):
```
psql tawati_chemist -f migrations/001_add_units_per_pack.sql
psql tawati_chemist -f migrations/002_add_products.sql
```

Seed it with starter data (categories, suppliers, medicines with real
batches, two demo users, one chronic patient):

```
python seed.py
```

This creates two logins:
- `owner` / `owner123` — full access
- `jane` / `worker123` — worker access

Then run the API:

```
python app.py
```

The API listens on `http://localhost:4000` by default (`PORT` in `.env`).
`GET /health` returns `{ "ok": true }` once it's up. For production,
run it behind `gunicorn` instead of the Flask dev server:
```
gunicorn -w 4 -b 0.0.0.0:4000 app:app
```

## Structure

```
backend/
  schema.sql              full table definitions
  app.py                  Flask app factory: registers blueprints,
                           CORS, error handling; entry point
  db.py                   connection pool + query()/transaction() helpers
  auth_utils.py            JWT creation, require_auth/require_owner decorators
  seed.py                  python seed.py — starter data + demo users
  blueprints/              one file per resource (routes + DB logic together —
                           Flask blueprints don't split those into separate
                           controller/route files the way Express does)
```

## API overview

All routes except `/auth/login` require `Authorization: Bearer <token>`,
obtained from logging in. Routes marked (owner) additionally require the
logged-in user's role to be `owner` — a worker token gets a 403.

```
POST   /api/auth/login              { username, password } -> { token, user }
GET    /api/auth/me                 current user from the token

GET    /api/medicines               list, with computed stock + nearest expiry
POST   /api/medicines               (owner) create medicine, optional first batch
POST   /api/medicines/:id/batches   restock an existing medicine

GET    /api/products                list, with flat stock count (no batches)
POST   /api/products                (owner) create a non-medicine shop item
POST   /api/products/:id/restock    restock an existing shop item

GET    /api/categories
GET    /api/suppliers               (owner)
POST   /api/suppliers               (owner)

GET    /api/patients
POST   /api/patients
GET    /api/patients/:id            profile: usual medicines + purchase history

POST   /api/sales                   { items: [{medicineId, quantity}], paymentMethod, patientId? }
                                     FEFO batch allocation, transactional,
                                     rolls back entirely on insufficient stock

GET    /api/stock-movements         (owner) ?type=Received|Sold|Expired|Adjustment
GET    /api/alerts                  low stock / out of stock / expiring / expired
GET    /api/reports                 (owner) ?months=1|3|12 — all 8 report charts

GET    /api/users                   (owner) staff accounts
POST   /api/users                   (owner) create a worker account
PATCH  /api/users/:id/status        (owner) { status: "active" | "deactivated" }
POST   /api/users/:id/reset-password (owner) { password }

GET    /api/settings                (owner) shop details
PUT    /api/settings                (owner) update shop details
```

Request bodies use the same camelCase field names as before
(`brandName`, `sellingPrice`, `patientId`, etc.) and responses use the
same snake_case column names the frontend already expects
(`brand_name`, `generic_name`, `selling_price`...) — this is a like-for-like
swap of the runtime, not a new API. The React frontend needed zero
changes to work against this version.

## Notes

- **Stock is never stored directly on a medicine** — it's always
  `SUM(batches.quantity_remaining)`, computed at query time.
- **Sales are fully transactional and FEFO-aware** — `blueprints/sales.py`
  locks the relevant batches (`FOR UPDATE`), allocates the sale across
  them oldest-expiry-first, and rolls back the whole sale if stock runs
  out partway through.
- **Every stock change writes a `stock_movements` row** — sales, restocks,
  and (once built) expiry/damage adjustments.
- **Numeric/date serialization**: psycopg (v3) returns `NUMERIC` columns as
  Python `Decimal` and dates as `datetime.date` — neither is
  JSON-serializable by default, so `db.to_jsonable()` converts both
  before every response.
