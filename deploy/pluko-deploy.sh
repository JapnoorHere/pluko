#!/usr/bin/env bash
# Update Pluko from GitHub main and rebuild, rolling back if the new version is unhealthy.
# Install on the server as root: install -m 755 deploy/pluko-deploy.sh /usr/local/bin/pluko-deploy
# Assumes the repo is cloned at /srv/pluko/src, owned by the "pluko" user, with deploy/.env in place.
set -uo pipefail
exec 9>/srv/pluko/.deploy.lock
flock -n 9 || { echo "another deploy is already running"; exit 1; }
cd /srv/pluko/src/deploy
compose() { docker compose --env-file .env -f docker-compose.production.yml "$@"; }

echo "-> pulling main"
runuser -u pluko -- git -C /srv/pluko/src fetch --quiet origin main || exit 1
runuser -u pluko -- git -C /srv/pluko/src reset --hard origin/main || exit 1
echo "   now at $(runuser -u pluko -- git -C /srv/pluko/src log --oneline -1)"

echo "-> remembering the running version for rollback"
for s in api worker; do docker tag "pluko-$s:latest" "pluko-$s:previous" 2>/dev/null || true; done

healthy() {
  for i in $(seq 1 40); do
    [ "$(docker inspect -f '{{.State.Health.Status}}' pluko-api-1 2>/dev/null)" = "healthy" ] \
      && curl -fsS http://127.0.0.1:4180/health >/dev/null && return 0
    sleep 3
  done
  return 1
}

# Tell Bing, Yandex and other IndexNow engines that the public pages may have changed.
# The key is the name of the 32-character .txt file in public/; it is public by design.
# Failures are reported but never fail the deploy.
notify_search_engines() {
  local origin key urls
  origin=$(grep -E '^PUBLIC_ORIGIN=' .env | tail -1 | cut -d= -f2- | sed 's#/*$##')
  key=$(ls /srv/pluko/src/public | grep -E '^[0-9a-f]{32}\.txt$' | head -1 | sed 's/\.txt$//')
  [ -n "$origin" ] && [ -n "$key" ] || { echo "   indexnow: skipped (no origin or key)"; return 0; }
  urls=$(curl -fsS --max-time 15 "$origin/sitemap.xml" | grep -oE '<loc>[^<]+</loc>' | sed -E 's#</?loc>##g; s#.*#"&"#' | paste -sd, -)
  [ -n "$urls" ] || { echo "   indexnow: skipped (empty sitemap)"; return 0; }
  curl -sS --max-time 15 -o /dev/null -w "   indexnow: HTTP %{http_code}\n" -H 'Content-Type: application/json; charset=utf-8' \
    -d "{\"host\":\"${origin#https://}\",\"key\":\"$key\",\"keyLocation\":\"$origin/$key.txt\",\"urlList\":[$urls]}" \
    https://api.indexnow.org/indexnow || echo "   indexnow: request failed"
}

echo "-> building and starting"
if compose up -d --build && healthy; then
  echo "-> healthy"
  docker image prune -f >/dev/null 2>&1
  notify_search_engines

  echo "deployed: $(runuser -u pluko -- git -C /srv/pluko/src log --oneline -1)"
  exit 0
fi

echo "!! new version did not become healthy, rolling back"
docker logs pluko-api-1 --tail 20 2>&1
for s in api worker; do docker tag "pluko-$s:previous" "pluko-$s:latest" 2>/dev/null || true; done
compose up -d --no-build
exit 1
