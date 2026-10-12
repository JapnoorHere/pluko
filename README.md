<div align="center">
  <img src="public/logo.svg" alt="Pluko" width="64" height="64" />
  <h1>Pluko</h1>
  <p><strong>Image search for your applications.</strong></p>
  <p>Search the web. Get image URLs and source metadata.<br />Manage it all from one workspace.</p>
  <p>
    <img src="https://img.shields.io/badge/Node.js-24%2B-339933?style=flat-square" alt="Node.js 24 or newer" />
    <img src="https://img.shields.io/badge/Next.js-App_Router-171717?style=flat-square" alt="Next.js App Router" />
    <img src="https://img.shields.io/badge/UI-shadcn%2Fui-818cf8?style=flat-square" alt="shadcn/ui" />
    <img src="https://img.shields.io/badge/Storage-SQLite-003b57?style=flat-square" alt="SQLite" />
  </p>
  <p><a href="#quick-start">Quick start</a> · <a href="#using-the-api">API example</a> · <a href="#how-it-is-built">Architecture</a> · <a href="#deployment">Deployment</a></p>
</div>

---

Pluko brings image search, background processing, and request inspection into one small service. Create a project, generate a key, and request images from your backend. The dashboard gives you a place to try queries, follow jobs, and see what your application is sending.

It returns **URLs and metadata**, not downloaded image files. Images stay with their original hosts.

> **Project status:** active development. Local use and a single-server deployment are supported by the current architecture. Review the deployment notes before exposing it publicly. A public marketing page is planned; the current web interface is the workspace.

## What you can do

| Capability | What it means |
| --- | --- |
| Single and batch searches | Send one query or several, each with its own requested count. |
| Background jobs | Submit a search immediately, then poll for progress and retrieve results in pages. |
| Source-aware results | Get full-image URLs, available thumbnails, source links, titles, and dimensions. |
| Projects and API keys | Organize applications, scope keys, set expiration dates, and revoke access. |
| Search playground | Test a query before wiring it into your application. |
| Request history | Inspect sanitized request/response logs and timing. |
| Quality feedback | Report irrelevant, broken, or watermarked results. |
| Admin workspace | Manage users, quotas, source rules, provider settings, audit history, retention, and backups. |

## Quick start

You need **Node.js 24+** and **pnpm**. SQLite is provided by Node, so there is no separate database server to install.

```bash
git clone https://github.com/JapnoorHere/pluko.git
cd pluko
pnpm install --frozen-lockfile
node manage.mjs bootstrap you@example.com
node dev.mjs
```

Open [localhost:4180](http://127.0.0.1:4180). The bootstrap command writes a one-time setup link to `LOCAL-SETUP.txt`. Open that link, choose your password, sign in, and enroll an authenticator for the administrator account.

Run bootstrap only on a fresh database, before creating any accounts. It does not create a default password. Keep the setup file private.

`node dev.mjs` starts the Next.js frontend, API, and background worker together. Leave that terminal running while you develop.

### Your first search

1. Create a project in the dashboard.
2. Generate an API key with `search` and `read` scopes. Copy it when shown; the full key is displayed only once.
3. Try the Playground, or use the HTTP examples below from your backend.
4. Open Search jobs to inspect progress and results.

## Using the API

The following examples use a POSIX shell. Set `PLUKO_API_KEY` in your shell or secret manager first. Keep keys out of browser and mobile client code.

### 1. Submit a search

```bash
curl -X POST http://127.0.0.1:4180/v1/images/search \
  -H "Authorization: Bearer $PLUKO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"mountain landscape","count":"15","min_width":1000}'
```

The API returns `202 Accepted` with a job ID and URLs for status and results:

```json
{
  "job_id": "job_...",
  "reused": false,
  "status_url": "/v1/jobs/job_...",
  "results_url": "/v1/jobs/job_.../results",
  "request_id": "req_..."
}
```

`count` is a positive decimal string. Large counts stay precise and are processed as paginated jobs. There is no arbitrary image-count cap, but the provider may run out of distinct results and project quotas still apply.

### 2. Check progress

```bash
curl http://127.0.0.1:4180/v1/jobs/JOB_ID \
  -H "Authorization: Bearer $PLUKO_API_KEY"
```

Jobs move through `queued` and `running`, then finish as `complete`, `partial`, or `cancelled`. A partial result is a valid outcome; inspect the query's reason. Use polling backoff rather than a tight request loop.

### 3. Retrieve images

```bash
curl "http://127.0.0.1:4180/v1/jobs/JOB_ID/results?limit=100&after=0" \
  -H "Authorization: Bearer $PLUKO_API_KEY"
```

Use the response's `next_cursor` as `after` for subsequent pages, until it is `null`. Pages contain up to 100 results. A result includes fields such as:

```json
{
  "image_url": "https://source.example/image.jpg",
  "thumbnail_url": "https://source.example/preview.jpg",
  "source_url": "https://source.example/photo",
  "title": "Mountain landscape",
  "width": 1200,
  "height": 1800,
  "dimensions_verified": false,
  "license_status": "unknown"
}
```

These are illustrative URLs. Thumbnail availability varies by result. Dimensions come from provider metadata, not image downloads.

### Batch queries

Send this payload to the same search endpoint:

```json
{
  "queries": [
    { "query": "mountain landscape", "count": "15" },
    { "query": "wireless headphones", "count": "30" }
  ],
  "min_width": 800,
  "watermark_policy": "prefer_clean"
}
```

Queries must be unique within a job. Request bodies are capped at 64 KiB; split very large batches into separate jobs. An optional `Idempotency-Key` header lets you safely retry a submission with the same payload. Reusing it for different input returns a conflict.

## How it is built

This is one repository for the frontend, backend, and worker. They share the data model but keep their responsibilities separate.

```text
Browser ──────────── Next.js dashboard
                            │
Your backend ─────── HTTP API (/v1/*)
                            │
                      SQLite (WAL)
                            │
                     Background worker
                            │
                     Bing image results
```

- **Frontend:** Next.js App Router, React, Tailwind CSS, official shadcn/ui components, and Geist typography.
- **API:** Node HTTP handlers, versioned public endpoints, input validation, authentication, and request logging.
- **Worker:** searches provider pages, filters candidates, deduplicates URLs, and saves result metadata.
- **Storage:** SQLite in WAL mode on local persistent disk.
- **Security:** hashed API keys, password hashing, administrator TOTP, session handling, CSRF protection, and account/key rate limits.

The current provider reads Bing's public image-search responses through direct HTTP requests. It is not an official Bing API integration and does not require browser automation. Upstream changes or restrictions can affect availability.

```text
app/                 Next.js routes and theme
components/          Dashboard screens and shadcn controls
api-server.mjs       API routes and access checks
server.mjs           Next.js and API host
worker.mjs           Background job processing
jobs.mjs             Job validation and orchestration
provider.mjs         Search provider integration
db.mjs               Database schema and queries
security.mjs         Authentication and security helpers
test/                Backend tests
deploy/              Single-server Docker and Caddy setup
```

## Development

| Command | Purpose |
| --- | --- |
| `node dev.mjs` | Run the frontend, API, and worker locally. |
| `pnpm build` | Build the Next.js frontend for production. |
| `pnpm test` | Run backend tests. |
| `node start.mjs` | Start the production web/API process after building. |
| `node worker.mjs` | Start a separate worker. |
| `node manage.mjs backup` | Create a local database backup. |

Configuration comes from environment variables. `.env.example` documents the settings; copying it alone does not load it into every process. Set variables in your environment or use Node's `--env-file` option when starting processes.

| Variable | Local default / purpose |
| --- | --- |
| `PORT` | `4180` |
| `HOST` | `127.0.0.1` |
| `PUBLIC_ORIGIN` | `http://127.0.0.1:4180` |
| `DATA_DIR` | `./data` |
| `ENCRYPTION_KEY` | Required for non-local production; 64 random hexadecimal characters. |
| `TRUST_PROXY` | Enable only behind a trusted, exclusive reverse proxy. |

## Deployment

The `deploy/` directory contains a single-server stack with an API container, worker, and Caddy for HTTPS.

1. Point your domain at the server and allow ports 80 and 443.
2. Copy `deploy/.env.production.example` to `deploy/.env`.
3. Set the domain, public origin, and a persistent encryption key. Generate the key with `openssl rand -hex 32` and keep it private.
4. From `deploy/`, run:

```bash
docker compose --env-file .env -f docker-compose.production.yml up -d --build
```

Bootstrap the administrator on the fresh deployment:

```bash
docker compose --env-file .env -f docker-compose.production.yml exec api node manage.mjs bootstrap you@example.com
docker compose --env-file .env -f docker-compose.production.yml exec api cat LOCAL-SETUP.txt
```

Use the setup link, enroll administrator MFA, and verify `/health`. Keep backups and the encryption key in separate secure storage, and test restoring them.

### Before a public launch

- Disable open signup or add verified-email signup and abuse controls. Local self-registration is intended for evaluation.
- Keep SQLite on one host with local persistent storage. Multiple API replicas need a different database and job-coordination design.
- Run the worker as well as the API; queued jobs cannot progress without it.
- Review provider terms and source-image licensing for your use case. Finding an image does not grant permission to reuse it.
- Watermark filtering uses source/title hints. It does not remove watermarks or guarantee clean images.

## Working on Pluko

Bug reports are most useful with the steps to reproduce, expected behavior, and a sanitized error message. Never include real API keys, session cookies, setup links, or private request logs.

For changes, keep the public API compatible, keep provider logic out of React components, and run `pnpm test` and `pnpm build` before opening a pull request.

If Pluko is useful to you, a star helps other developers find it.
