# Tawati Chemist

Pharmacy inventory + dispensing system.

## Structure

```
tawati-chemist/
  frontend/   React + Vite + Tailwind CSS UI
  backend/    Flask API, PostgreSQL (raw SQL via psycopg2)
```

## Running it locally

You'll need PostgreSQL running locally (or a connection string to one).

**1. Backend:**
```
cd backend
python3 -m venv venv
source venv/bin/activate        # on Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in DATABASE_URL and JWT_SECRET
createdb tawati_chemist
psql tawati_chemist -f schema.sql
python seed.py                  # creates demo users + starter data
python app.py                   # http://localhost:4000
```

**2. Frontend** (separate terminal):
```
cd frontend
npm install
cp .env.example .env        # VITE_API_URL, defaults to localhost:4000/api
npm run dev                 # http://localhost:5173
```

## Demo logins

Created by `npm run seed` in the backend:
- `owner` / `owner123` — full access
- `jane` / `worker123` — worker access

## What's implemented

**Frontend** — all 9 screens, wired to the real API (no mock data left):
Dashboard, Dispense (cart, patient lookup + quick-add, cash/M-Pesa with
live change calculator), Inventory (search/filter, add-medicine), Stock
Movements, Suppliers, Patients (list + profile with refill-due tracking),
Alerts, Reports (owner-only, 8 charts), Settings (owner-only, shop
details + staff accounts). Responsive top nav, role-based access, empty
and error states throughout.

**Backend** — full REST API over the schema in `backend/schema.sql`,
built in Flask: JWT auth, role-gated routes, transactional/FEFO-aware
sale creation with row-locking (two simultaneous sales can't oversell
the same batch), computed stock (never stored, always derived from
batches), and the full report query set. See `backend/README.md` for
the complete route list.

## Not built yet

- Password reset flow uses a plain browser prompt — fine for a first
  pass, worth a real form later
- No pagination (fine at current data volumes, worth adding if the
  medicine/patient lists grow large)
- No automated tests
