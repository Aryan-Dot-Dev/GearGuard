# GearGuard Maintenance Board

A two-part app for tracking maintenance requests: a React/Vite front end and an Express + Sequelize back end on PostgreSQL.

## Stack
- Frontend: React 19, Vite, TypeScript, Tailwind v4 (unstyled utility import), custom brutalist UI.
- Backend: Express 5, Sequelize-Typescript (PostgreSQL), Zod validation, tsx runtime (ESM), CORS enabled.
- Database: PostgreSQL.

## Project structure
```
client/   # React front end
server/   # Express API + Sequelize models and seed
```

## Prerequisites
- Node 18+ and pnpm (`corepack enable` recommended)
- PostgreSQL running and reachable

## Backend setup (server)
1) Install deps:
   ```bash
   cd server
   pnpm install
   ```
2) Configure environment (`server/.env`):
   ```env
   PORT=5000
   CLIENT_ORIGIN=http://localhost:5173
   DB_URL=postgres://postgres:password@localhost:5432/gearguardian
   # or use individual settings below instead of DB_URL
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=gearguardian
   DB_USER=postgres
   DB_PASSWORD=password
   ```
3) Start API (auto syncs schema):
   ```bash
   pnpm dev
   ```
4) Seed demo data (resets DB — do not run in prod):
   ```bash
   pnpm seed
   ```

Key API notes:
- Base URL: `http://localhost:5000/api` (change with `PORT`).
- Auth header required: `x-user-id` must match a seeded user (e.g., `alex.mechanic`, `sam.spark`).
- Health check: `GET /health`.

## Frontend setup (client)
1) Install deps:
   ```bash
   cd client
   pnpm install
   ```
2) Create `client/.env` (optional if using default API base):
   ```env
   VITE_API_BASE=http://localhost:5000/api
   ```
3) Run dev server:
   ```bash
   pnpm dev
   ```
   Default Vite port: 5173.

## Using the app
- Pick a seeded user from the top-right selector; the app sends `x-user-id` for all requests.
- Create requests with "Add a fix card"; cards land in the Kanban lanes.
- Drag cards to change state or open a card to reassign helper/technician.

## Scripts
- Frontend: `pnpm dev`, `pnpm build`, `pnpm preview`, `pnpm lint`.
- Backend: `pnpm dev`, `pnpm start`, `pnpm seed`.

## Troubleshooting
- "x-user-id missing" or 401: choose a seeded user (alex.mechanic / sam.spark) or add your own via DB.
- DB connection errors: verify `DB_URL`/`DB_*` in `.env` and that Postgres is running.
- CORS: set `CLIENT_ORIGIN` to your frontend origin.

## API quick reference
- `GET /api/teams`
- `GET /api/equipment`
- `GET /api/requests/kanban`
- `POST /api/requests` (subject, type, equipmentId, dueDate?, scheduledDate?)
- `GET /api/requests/:id`
- `PATCH /api/requests/:id/state` (state)
- `PATCH /api/requests/:id/assign` (technicianId)

## Data model (simplified)
- Team: name, members
- TeamMember: name, userId, email, role (manager/technician), teamId
- Equipment: name, serialNumber, location, maintenanceTeamId, defaultTechnicianId, status
- MaintenanceRequest: subject, description, type (corrective/preventive), state (new/in_progress/repaired/scrap), equipmentId, teamId, technicianId, dueDate?, scheduledDate?, overdue (computed client-side)

## Notes
- Sequelize sync runs with `{ alter: true }` in dev; adjust for production migrations.
- Seed script uses `sync({ force: true })` and wipes data — avoid running in prod.
