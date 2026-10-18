<div align="center">
  <img src="public/logo.svg" alt="Pluko" width="64" height="64" />
  <h1>Pluko</h1>
  <p><strong>Image search for your applications.</strong></p>
  <p>Send a query. Get image URLs, source links and metadata back.<br />Manage keys and watch requests from one workspace.</p>
  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square" alt="License: AGPL-3.0" /></a>
    <img src="https://img.shields.io/badge/Node.js-24%2B-339933?style=flat-square" alt="Node.js 24 or newer" />
    <img src="https://img.shields.io/badge/Next.js-App_Router-171717?style=flat-square" alt="Next.js App Router" />
    <img src="https://img.shields.io/badge/Storage-SQLite-003b57?style=flat-square" alt="SQLite" />
    <img src="https://img.shields.io/badge/PRs-welcome-818cf8?style=flat-square" alt="Pull requests welcome" />
  </p>
  <p>
    <a href="https://pluko.pstack.in"><strong>pluko.pstack.in</strong></a> ·
    <a href="https://pluko.pstack.in/docs">Docs</a> ·
    <a href="#using-the-api">API</a> ·
    <a href="#2-host-it-yourself">Self-host</a> ·
    <a href="#3-contribute">Contribute</a>
  </p>
</div>

---

Pluko is a small service for image search. Your backend sends a search, Pluko runs it as a background job, and you read back image URLs, thumbnails, source pages, titles and dimensions. A web workspace lets you create projects and API keys, try queries in a playground, and inspect every request your app makes.

Pluko returns **URLs and metadata only**. It never downloads or stores image files. Images stay with their original hosts.

Pluko is built and run by [pStack](https://pstack.in) and is open source under the [AGPL-3.0](#license).

## Three ways to use Pluko

| | Who it's for | What you do |
| --- | --- | --- |
| **[1. Use the hosted service](#1-use-the-hosted-service)** | You want image search in your app and don't want to run servers. | Sign up at [pluko.pstack.in](https://pluko.pstack.in), create a key, call the API. |
| **[2. Host it yourself](#2-host-it-yourself)** | You want your own instance, on your own server and domain. | Clone the repo, run it with Docker behind Caddy, optionally auto-deploy from GitHub. |
| **[3. Contribute](#3-contribute)** | You want to fix a bug, add a feature or improve the docs. | Fork, run it locally, open a pull request. |

---

## 1. Use the hosted service

The quickest way to start. We run it at **https://pluko.pstack.in**.

1. Open the [workspace](https://pluko.pstack.in/app) and create an account.
2. Create a **project**, then generate an **API key** with the `search` and `read` scopes. Copy it right away. The full key is shown only once.
3. Try a query in the **Playground** to see what comes back.
4. Store the key in your backend's environment, for example `PLUKO_API_KEY`, and call the API from your server code. Never put the key in browser or mobile code.
5. Watch your calls under **Request logs** and **Search jobs** in the workspace.

```bash
curl -X POST https://pluko.pstack.in/v1/images/search \
  -H "Authorization: Bearer $PLUKO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query":"mountain landscape","count":"15","min_width":1000}'
```

Current limits are listed at [/limits](https://pluko.pstack.in/limits), service health at [/status](https://pluko.pstack.in/status), and the machine-readable API description at [/v1/openapi.json](https://pluko.pstack.in/v1/openapi.json). The full integration guide is at [/docs](https://pluko.pstack.in/docs).

## Using the API

The examples below use the hosted address. If you host Pluko yourself, swap in your own domain, or `http://127.0.0.1:4180` when running locally.

### Submit a search

```bash
curl -X POST https://pluko.pstack.in/v1/images/search \
  -H "Authorization: Bearer $PLUKO_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: landscape-search-v1" \
  -d '{"query":"mountain landscape","count":"15","min_width":1000}'
```

Search runs in the background, so the API answers right away with `202 Accepted`:

```json
{
  "job_id": "job_...",
  "reused": false,
  "status_url": "/v1/jobs/job_...",
  "results_url": "/v1/jobs/job_.../results",
  "request_id": "req_..."
}
```

`count` is a positive number written as a string. Large counts are handled as paginated jobs. The `Idempotency-Key` header is optional. It lets you retry the same submission safely: identical input returns the original job, and different input with the same key returns `409 IDEMPOTENCY_CONFLICT`.

### Check progress

```bash
curl https://pluko.pstack.in/v1/jobs/JOB_ID \
  -H "Authorization: Bearer $PLUKO_API_KEY"
```

A job moves through `queued` and `running`, then ends as `complete`, `partial` or `cancelled`. `partial` is a normal outcome: the source ran out of distinct results, and the job says why. Poll with a backoff rather than in a tight loop, or use [webhooks](#features).

### Read the results

```bash
curl "https://pluko.pstack.in/v1/jobs/JOB_ID/results?limit=100&after=0" \
  -H "Authorization: Bearer $PLUKO_API_KEY"
```

Pages hold up to 100 results. Pass the response's `next_cursor` as `after` to get the next page, until it is `null`. A result looks like this (illustrative values):

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

Dimensions come from source metadata, not from downloading the image. Not every result has a thumbnail.

### Several queries in one job

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

Queries must be unique within a job, and a request body can be at most 64 KiB. Split very large batches into separate jobs.

### Features

| Feature | What it means |
| --- | --- |
| Single and batch searches | One query or many, each with its own count. |
| Background jobs | Submit now, poll for progress, read results in pages. |
| Source-aware results | Full-image URL, thumbnail when available, source page, title, dimensions. |
| Filters | Safe search, image type, shape, size, colour, minimum width, excluded sites. |
| Projects and API keys | Scoped keys with expiry dates and instant revoke. |
| Playground | Try a query before wiring it into your app. |
| Request logs | Sanitized request and response history with timing. |
| Webhooks | Signed `job.finished` notifications with retries, instead of polling. |
| Usage | Daily usage in the workspace and at `GET /v1/usage`. |
| Result feedback | Flag irrelevant, broken or watermarked results. |
| Account controls | Optional authenticator app, session list, data export, account deletion. |
| Admin workspace | Users, quotas, source rules, provider settings, audit history, retention, backups. |

> **About image rights.** Finding an image does not give you permission to reuse it. Pluko keeps the source link with every result so you can check the license yourself, and it never claims a license unless the source provides one. Watermark filtering uses hints from the source and title. It does not remove watermarks or guarantee a clean image.

---

## 2. Host it yourself

Pluko runs on a single server: one container for the web app and API, and one for the background worker. It uses SQLite, so there's no separate database server.

### Try it locally first

You need **Node.js 24+** and **pnpm** (`corepack enable` gives you pnpm).

```bash
git clone https://github.com/JapnoorHere/pluko.git
cd pluko
pnpm install --frozen-lockfile
node manage.mjs bootstrap you@example.com
node dev.mjs
```

`node dev.mjs` starts the web app, API and worker together on http://127.0.0.1:4180. Open [/app](http://127.0.0.1:4180/app).

The bootstrap command creates the first administrator. It writes a one-time setup link, valid for 24 hours, to `LOCAL-SETUP.txt`. Open that link, choose a password, and set up an authenticator app. There's no default password. Run bootstrap once, on an empty database, and keep the setup file private.

### Deploy to a server

This is how we run [pluko.pstack.in](https://pluko.pstack.in). It's an Ubuntu server where Caddy already serves other sites, and Pluko runs in Docker under its own system user.

**You need:** a Linux server with Docker and the Compose plugin, a domain or subdomain, and ports 80 and 443 open. Run the commands below as root.

**Step 1. Point your domain at the server.** Add an A record, for example `images.example.com → your server's IP`. Check it with:

```bash
getent hosts images.example.com
```

**Step 2. Create a service user** that can't log in, so Pluko's files are kept apart from everything else:

```bash
useradd --system --create-home --home-dir /srv/pluko --shell /usr/sbin/nologin pluko
```

**Step 3. Clone the code** as that user:

```bash
sudo -u pluko -H git clone https://github.com/JapnoorHere/pluko.git /srv/pluko/src
```

Deploying a private fork? Give the `pluko` user an SSH key (`sudo -u pluko ssh-keygen -t ed25519`), add its `.pub` to your repo under **Settings → Deploy keys** with write access off, and clone with the `git@github.com:` URL instead.

**Step 4. Create the encryption key** once and keep it somewhere only root can read. Pluko uses it to encrypt secrets in its database. If you lose it, those secrets can't be decrypted, so back it up separately from the database.

```bash
install -d -m 700 -o root -g root /srv/pluko/deploy-secrets
openssl rand -hex 32 > /srv/pluko/deploy-secrets/encryption.key
chmod 600 /srv/pluko/deploy-secrets/encryption.key
```

**Step 5. Write the production settings** (`deploy/.env.production.example` lists them):

```bash
cd /srv/pluko/src/deploy
cat > .env <<EOF
PLUKO_DOMAIN=images.example.com
PUBLIC_ORIGIN=https://images.example.com
ENCRYPTION_KEY=$(cat /srv/pluko/deploy-secrets/encryption.key)
API_PORT=4180
EOF
chown root:root .env && chmod 600 .env
```

**Step 6. Build and start** the API and worker:

```bash
docker compose --env-file .env -f docker-compose.production.yml up -d --build
docker ps --filter name=pluko --format '{{.Names}}\t{{.Status}}'
curl -s http://127.0.0.1:4180/health
```

After about 20 seconds, `pluko-api-1` should show `(healthy)`, `pluko-worker-1` should show `Up`, and `/health` should return `{"status":"ok",...}`. The app only listens on `127.0.0.1`, so nothing is exposed until the next step.

**Step 7. Put it behind HTTPS.** If Caddy already runs on the server, add the block from `deploy/Caddyfile.host-proxy` with your domain to `/etc/caddy/Caddyfile`, then:

```bash
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile && systemctl reload caddy
```

Caddy gets the certificate automatically. If nothing else uses ports 80 and 443, you can skip installing Caddy and use the bundled one instead: add `--profile caddy` to the command in step 6.

**Step 8. Create your administrator:**

```bash
docker compose --env-file .env -f docker-compose.production.yml exec api node manage.mjs bootstrap you@example.com
docker compose --env-file .env -f docker-compose.production.yml exec api cat LOCAL-SETUP.txt
```

Open the setup link, set a password, set up the authenticator app, and you're live.

**Step 9. Back it up.** This writes a copy of the database into the data volume and prints its path:

```bash
docker compose --env-file .env -f docker-compose.production.yml exec api node manage.mjs backup
```

Copy backups off the server regularly and test restoring one. Store the encryption key separately from the backups.

### Auto-deploy on every push (optional)

The included GitHub Actions workflow (`.github/workflows/deploy.yml`) runs the tests on every push to `main`. If they pass, it connects to your server and runs one deploy script. That script pulls the new code, rebuilds, waits for the app to report healthy, and **rolls back to the previous version automatically** if it doesn't.

The SSH key GitHub uses is locked to that one script. It can't open a shell, read files or do anything else on the server.

**1. Install the deploy script**, owned by root so the `pluko` user can't change it:

```bash
install -m 755 -o root -g root /srv/pluko/src/deploy/pluko-deploy.sh /usr/local/bin/pluko-deploy
```

**2. Let the `pluko` user run only that script with sudo.** It also needs a real shell, because SSH runs the locked command through the user's shell:

```bash
usermod -s /bin/bash pluko
echo 'pluko ALL=(root) NOPASSWD: /usr/local/bin/pluko-deploy' > /etc/sudoers.d/pluko
chmod 440 /etc/sudoers.d/pluko && visudo -cf /etc/sudoers.d/pluko
```

**3. Make a key pair for GitHub.** Do this on your own computer, not the server:

```bash
ssh-keygen -t ed25519 -N "" -C "github-actions-pluko" -f pluko-ci
ssh-keyscan -t ed25519 YOUR_SERVER_IP
```

**4. Lock the public key to the script** on the server. Paste the contents of `pluko-ci.pub`:

```bash
mkdir -p /srv/pluko/.ssh && chmod 700 /srv/pluko/.ssh && chown pluko:pluko /srv/pluko/.ssh
cat > /srv/pluko/.ssh/authorized_keys <<'EOF'
restrict,command="sudo -n /usr/local/bin/pluko-deploy" ssh-ed25519 AAAA...your-public-key... github-actions-pluko
EOF
chown root:pluko /srv/pluko/.ssh/authorized_keys && chmod 644 /srv/pluko/.ssh/authorized_keys
```

**5. Add three repository secrets** on GitHub, under **Settings → Secrets and variables → Actions**:

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | Your server's IP address or hostname |
| `DEPLOY_SSH_KEY` | The full contents of the private key file `pluko-ci`, including the `BEGIN` and `END` lines |
| `DEPLOY_KNOWN_HOSTS` | The line printed by `ssh-keyscan` above |

Then delete the private key file from your computer. GitHub keeps the only copy it needs.

**6. Push to `main`.** Follow the run under the repo's **Actions** tab. A successful deploy ends with `-> healthy` and a `deployed: <commit>` line.

To deploy by hand at any time, run `sudo /usr/local/bin/pluko-deploy` on the server.

### Before opening it to the public

- **Signups.** Self-registration is meant for evaluation. For a public instance, add verified-email signup and abuse controls, or switch to invitations.
- **One server only.** SQLite must live on the server's own disk, not a network share. Don't run more than one copy of the API against the same database.
- **Run the worker.** Without the worker container, searches stay queued forever.
- **Image source.** The default `bing` provider reads Bing's public image-search pages over plain HTTP. It is not an official Bing API. It can be blocked, rate limited or restricted by Bing's terms, so test it from your server and review those terms first. The `mock` provider exists for tests and is refused in production.

### Configuration

| Variable | Default / purpose |
| --- | --- |
| `PORT` | `4180` |
| `HOST` | `127.0.0.1` |
| `PUBLIC_ORIGIN` | `http://127.0.0.1:4180`. Use your HTTPS address in production. |
| `DATA_DIR` | `./data`. Where SQLite and backups live. |
| `ENCRYPTION_KEY` | Required in production. 64 random hex characters (`openssl rand -hex 32`). |
| `TRUST_PROXY` | Turn on only when the app is reachable exclusively through your reverse proxy. |
| `PLUKO_PROVIDER` | `bing` (default) or `mock` (tests only). |

Locally, `.env.example` documents these. Copying it does not load it into every process, so set the variables in your shell or start Node with `--env-file`.

---

## 3. Contribute

Pull requests are welcome. Bug fixes, tests, docs and new features all help.

### Get set up

1. Fork the repo and clone your fork.
2. Follow [Try it locally first](#try-it-locally-first).
3. Create a branch from `main`, for example `fix/job-retry` or `feat/colour-filter`.
4. Make your change, then run:

```bash
pnpm test
pnpm build
```

5. Open a pull request against `main`. Say what changed and why, how you tested it, and add a screenshot for UI changes.

For anything big, like a new provider, a schema change or a new public endpoint, open an issue first so we can agree on the approach before you write the code.

### Contribution rules

**API and data**

- **Don't break the public API.** Endpoints live under `/v1/`. Add fields; never rename or remove existing ones. If you change a public contract, update the docs page and `openapi.mjs` in the same pull request.
- **Database changes are additive.** Every schema change is a recorded migration. Use parameterized SQLite statements only. Never build SQL from strings.
- **Stay bounded.** Result pages are capped at 100 records and request bodies at 64 KiB. Big requests become paginated jobs, never one long HTTP request.
- **Never fake results.** A job must report `complete`, `partial` or `cancelled` truthfully. Don't pad results to reach a count.

**Security**

- **Treat every input as untrusted,** including HTML from image sources. Validate at every boundary and return a stable error code with a safe message.
- **Never log secrets.** No passwords, API keys, bearer headers, cookies, session tokens, setup or reset links, or authenticator codes in logs or the database.
- **API keys are shown once.** Store only a hash and prefix, never the raw key.
- **Authorization lives on the server.** Hiding a button in the UI is not access control. Admin features must be blocked at the route level.
- **Mutations from the browser** must check same-origin and the CSRF token.
- **Admin-level changes** (users, keys, quotas, rules, retention, providers, jobs, backups) must write an audit event.
- **Never remove watermarks,** and never claim an image's license unless the source provides one.

**Code**

- **Keep layers separate.** UI in `app/` and `components/`, HTTP in `api-server.mjs`, jobs in `jobs.mjs`, sources in `provider.mjs` and `providers.mjs`, storage in `db.mjs`. No provider parsing in React components or `server.mjs`.
- **Prefer Node 24 built-ins.** Add a dependency only when it clearly cuts security or maintenance risk, explain why in the pull request, and commit the updated `pnpm-lock.yaml`.
- **Test what you touch.** Add `node:test` tests in `test/` for parsers, validation, authorization, pagination and security rules.
- **UI uses the stock shadcn/ui components** in `components/ui`. Keep their default variants and styles, and handle page layout with your own CSS.
- **Use named constants** for limits and timeouts, not magic numbers.

**Commits and pull requests**

- **One-line commit messages** in plain English, imperative mood: `Add colour filter to batch search`, not `fixed stuff`.
- **One topic per pull request.** Keep refactors separate from features.
- **Docs.** `README.md` is the only Markdown file in the repo. Put user-facing docs in the app's `/docs` page.
- **Never commit** `.env` files, databases, backups, keys or setup files. The `.gitignore` already blocks them, so don't weaken it.
- **Tests must pass.** CI runs `pnpm test`, and a pull request with failing tests won't be merged.

### Reporting bugs

Open an issue with the steps to reproduce, what you expected, what happened instead, and a sanitized error message or `request_id`. Never paste real API keys, cookies, setup links or private request logs.

### Security issues

**Please don't open a public issue for a security problem.** Report it privately from the repo's **Security** tab → **Report a vulnerability**, and give us time to fix it before you disclose it.

### Licensing of contributions

By opening a pull request you agree that your contribution is licensed under the same [AGPL-3.0](LICENSE) license as the rest of the project.

---

## How it's built

One repository holds the web app, API and worker. They share a data model but keep their jobs separate.

```text
Browser ──────────── Next.js workspace (/app, /docs)
                            │
Your backend ─────── HTTP API (/v1/*)
                            │
                      SQLite (WAL)
                            │
                     Background worker
                            │
                     Image source (Bing)
```

- **Frontend:** Next.js App Router, React, Tailwind CSS, shadcn/ui and Geist.
- **API:** Node HTTP handlers with versioned endpoints, validation, authentication and request logging.
- **Worker:** fetches source pages, filters and deduplicates results, and saves the metadata.
- **Storage:** SQLite in WAL mode on local disk.
- **Security:** hashed API keys and passwords, admin authenticator codes, sessions, CSRF protection, and rate limits per account and key.

```text
app/                 Next.js routes and theme
components/          Workspace screens and shadcn/ui controls
api-server.mjs       API routes and access checks
server.mjs           Hosts Next.js and the API together
worker.mjs           Background job processing
jobs.mjs             Job validation and orchestration
provider.mjs         Source page parsing and safe fetching
providers.mjs        Image sources (bing, mock)
filters.mjs          Search filter validation and mapping
limits.mjs           Limits shared by the API, workspace and docs
webhooks.mjs         Signed webhook queue and delivery
openapi.mjs          OpenAPI description of the public API
account.mjs          Data export and account/project deletion
db.mjs               Schema, migrations and queries
security.mjs         Authentication and security helpers
manage.mjs           Admin CLI: bootstrap, reset-admin, recover-mfa, backup
test/                Backend tests
deploy/              Docker Compose, Caddy configs and the deploy script
.github/workflows/   Test and deploy pipeline
```

### Commands

| Command | Purpose |
| --- | --- |
| `node dev.mjs` | Run the web app, API and worker locally. |
| `pnpm test` | Run the backend tests. |
| `pnpm build` | Build the Next.js frontend. |
| `node start.mjs` | Start the production web app and API after a build. |
| `node worker.mjs` | Start the worker on its own. |
| `node manage.mjs bootstrap <email>` | Create the first administrator on an empty database. |
| `node manage.mjs reset-admin <email>` | Write a one-time password-reset link for an administrator to `LOCAL-ADMIN-RESET.txt` (valid 30 minutes). |
| `node manage.mjs recover-mfa <email>` | Remove a user's authenticator and sign them out everywhere, so they can set it up again. |
| `node manage.mjs backup` | Write a database backup to `DATA_DIR/backups`. |

---

## License

Pluko is licensed under the [GNU Affero General Public License v3.0](LICENSE).

You can use, modify and self-host it freely. If you run a **modified** version as a service that other people use over a network, you must make your modified source code available to those users under the same license.

Made by [pStack](https://pstack.in). If Pluko is useful to you, a ⭐ helps other developers find it.
