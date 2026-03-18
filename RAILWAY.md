# Railway Deployment Setup

This repository should be deployed to Railway as two services from the same GitHub repository.

## Services

### 1. Backend service

- GitHub repo: `noorrani-the-coder/Presopod`
- Root directory: `backend`
- Config as code path: `/backend/railway.json`
- Builder: Dockerfile

Recommended variables:

- `PORT=5000`
- `FLASK_DEBUG=false`
- `CORS_ORIGINS=<your-frontend-url>`

Database options:

- Recommended: attach a Railway Postgres service and set `DATABASE_URL` to the Postgres connection string.
- Simple fallback: keep SQLite by setting `DATABASE_URL=sqlite:///data/slidecast.db` and `SQLITE_DB_PATH=data/slidecast.db`, but you should also attach a persistent volume mounted at `/app/data`.

App secrets and provider keys should also be added in Railway Variables based on your local `.env`.

### 2. Frontend service

- GitHub repo: `noorrani-the-coder/Presopod`
- Root directory: `slidecast-ai/slidecast-ai`
- Config as code path: `/slidecast-ai/slidecast-ai/railway.json`
- Builder: Dockerfile

Required variable:

- `VITE_API_URL=https://<your-backend-service>.up.railway.app`

Because the frontend is built with Vite, `VITE_API_URL` must be set before deployment so it is baked into the static build.

## Why the root deploy failed

Railway originally tried to build the repository root with Railpack. This repository root is a monorepo container with separate `backend/` and `slidecast-ai/slidecast-ai/` apps, so Railpack could not infer a single app to run.

## Notes

- The backend Dockerfile now uses Railway's injected `PORT` variable at runtime.
- The frontend Dockerfile already works with Railway when the service root is set to `slidecast-ai/slidecast-ai`.
- You do not need separate GitHub repositories for frontend and backend.
