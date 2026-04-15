# ⚡ ProjectFlow v2 — Internal Department Project Tracker

Full-stack web app replacing Excel for department tracking. Built for **50+ concurrent users** with no lag or crashes.

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Recharts |
| Backend | Node.js, Express.js |
| Database | PostgreSQL (connection pool, handles 50+ users) |
| Auth | JWT tokens (7-day sessions) |
| Excel | xlsx library (read/write/export) |
| Charts | Recharts (bar, pie, line) |

## Features
- 📁 Project management with member & manager assignment
- 📊 Excel upload per project (admin/manager only), read-only view for members
- 🔐 Column-level permissions — admin sets which columns each user can edit
- ✏️ Inline cell editing with audit log
- 👷 Team reports with charts from Excel: WM Status, Spooler performance, Train distribution
- 👥 Role-based access: Admin / Manager / Member
- ✅ Tasks, Kanban, Milestones, Approvals
- 🐳 Docker Compose for one-command deploy

## Quick Start (Local)

```bash
# 1. Clone and install
git clone <repo-url> && cd projectflow
cd backend && npm install
cd ../frontend && npm install

# 2. Configure backend
cd ../backend
cp .env.example .env
# Edit .env — set DB credentials and JWT_SECRET

# 3. Create DB and migrate
createdb projectflow          # or use pgAdmin
npm run db:migrate
npm run db:seed

# 4. Start both servers
# Terminal 1:
cd backend && npm run dev     # API on http://localhost:5000

# Terminal 2:
cd frontend && npm run dev    # App on http://localhost:5173
```

## Default Logins (after seed)
| Email | Password | Role |
|---|---|---|
| admin@company.com | Admin@123 | Admin |
| priya@company.com | Manager@123 | Manager |
| sandeep@company.com | Member@123 | Member |

## Docker Deploy (Production)

```bash
# Edit docker-compose.yml — change DB_PASSWORD and JWT_SECRET
docker-compose up -d

# Run migrations inside container
docker-compose exec backend npm run db:migrate
docker-compose exec backend npm run db:seed
```

App at `http://your-server-ip`

## Git Setup

```bash
git init
git add .
git commit -m "Initial commit: ProjectFlow v2"
git remote add origin https://github.com/YOUR_USERNAME/projectflow.git
git push -u origin main
```

## Key API Endpoints
- `POST /api/auth/login` — Login
- `GET/POST /api/projects` — List/create projects
- `POST /api/projects/:id/upload-excel` — Upload Excel (admin/manager)
- `GET /api/projects/:id/excel-data` — View Excel data (all roles)
- `POST /api/projects/:id/column-permissions/bulk` — Set column edit permissions
- `POST /api/projects/:id/excel-cell` — Edit a cell (if permitted)
- `GET /api/projects/:id/excel-export` — Export as .xlsx (admin/manager)
- `GET/POST /api/users` — Manage users (admin only)
