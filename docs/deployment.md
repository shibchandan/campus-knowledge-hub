# Deployment, Testing, and Operations

## Testing

Backend tests are available in `server/test`.

Run:

```powershell
cd "C:\Users\shib chandan mistry\Documents\New project"
npm run test:server
```

Current coverage:

- API health endpoints
- auth validation rules

Recommended next additions:

- auth integration tests against a test database
- resource upload and delete tests
- admin panel governance workflow tests

## Docker Deployment

The repo now includes:

- `server/Dockerfile`
- `client/Dockerfile`
- `docker-compose.yml`

Run locally with Docker:

```powershell
docker compose up --build
```

Services:

- client: `http://localhost:8080`
- server: `http://localhost:5000`
- mongo: `mongodb://127.0.0.1:27017`

## Logging

Server logs are written to:

- `server/logs/requests.log`
- `server/logs/app.log`

These capture:

- HTTP request logs
- startup and database events
- audit-log creation failures

## Audit Trail

Sensitive actions are stored in MongoDB `auditlogs` through the audit module.

Examples:

- admin user creation and updates
- password changes
- notice CRUD
- academic structure CRUD
- subject CRUD
- college approval and college-profile changes
- resource upload, update, delete

Admin API:

- `GET /api/audit/logs`

## Backup Strategy

For local MongoDB:

```powershell
mongodump --db campus-knowledge-hub --out backups
```

For restore:

```powershell
mongorestore --db campus-knowledge-hub backups/campus-knowledge-hub
```

For Atlas:

- enable cluster snapshots
- export critical collections regularly
- keep `.env` secrets backed up separately and securely

## Monitoring Recommendations

Minimum:

- monitor `/health`
- review `app.log` and `requests.log`
- monitor disk usage for uploads when using local storage

Better production setup:

- uptime monitoring on `/health`
- error alerting from process manager or hosting provider
- database metrics from Atlas or MongoDB tools
- Cloudflare R2 storage/egress monitoring if cloud media storage is enabled
