# Docker Run Guide

## Run locally

```powershell
docker compose up --build
```

Frontend:

```text
http://localhost:8080
```

Backend:

```text
http://localhost:5000
```

## Notes

- SQLite, uploads, and generated audio are stored in the `backend-data` Docker volume.
- The compose setup forces SQLite with `data/slidecast.db`.
- Frontend API requests are built against `VITE_API_URL`.
- Backend CORS is set with `CORS_ORIGINS`.

## Deploying later

- Backend can be deployed from `backend/Dockerfile`.
- Frontend can be deployed from `slidecast-ai/slidecast-ai/Dockerfile`.
- For demo hosting with persistent local storage, mount `/app/data` to a persistent disk or volume.
