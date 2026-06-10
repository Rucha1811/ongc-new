# ONGC Advance Data Repository Portal

A full-stack data management portal with React frontend + FastAPI backend + PostgreSQL database.

---

## Architecture

```
Frontend  (React/Vite)   →  http://localhost:5173
Backend   (FastAPI)      →  http://localhost:8000
Database  (PostgreSQL)   →  localhost:5432
```

---

## Quick Start

### 1 — Start the database and backend

```bash
cd ongc-portal/backend

# Start PostgreSQL + FastAPI via Docker Compose
docker-compose up --build -d

# Seed the database with initial roles, users, and sample files
docker-compose exec api python seed.py
```

> Or run without Docker:
> ```bash
> pip install -r requirements.txt
> # Set env vars or edit .env for your local Postgres
> alembic upgrade head
> python seed.py
> uvicorn app.main:app --reload --port 8000
> ```

### 2 — Start the frontend

```bash
cd ongc-portal
npm install
npm run dev
```

Open **http://localhost:5173**

---

## Default Login Accounts (seeded)

| Role            | CPF    | Password |
|-----------------|--------|----------|
| Admin           | 100001 | admin123 |
| Ops Manager     | 100002 | ops123   |
| Data Creator    | 100003 | user123  |
| Viewer          | 100004 | view123  |

---

## How it works

- **Login** → `POST /api/auth/login` returns JWT token stored in memory
- **All API calls** use `Authorization: Bearer <token>`
- **Upload File** → multipart form POST to `/api/files/upload` — saved to disk + metadata in DB
- **File Records / Search** → `GET /api/files/search` with query params
- **Approve/Reject** → `POST /api/approvals/approve/{id}` or `/reject/{id}`
- **Dashboard stats** → `GET /api/dashboard/stats` — live counts from DB

No mock data is used in the frontend. All data comes from and is saved to PostgreSQL.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login, returns JWT |
| GET | /api/files/ | List all files |
| POST | /api/files/upload | Upload file + metadata |
| GET | /api/files/search | Search/filter files |
| GET | /api/files/download/{id} | Download file |
| POST | /api/approvals/approve/{id} | Approve file |
| POST | /api/approvals/reject/{id} | Reject file |
| GET | /api/dashboard/stats | Dashboard statistics |
| GET | /api/users/ | List users |
| GET | /api/reports/monthly | Monthly upload counts |

API docs available at **http://localhost:8000/docs**
