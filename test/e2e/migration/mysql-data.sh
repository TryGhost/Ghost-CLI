#!/usr/bin/env bash
# End-to-end check of `ghost migrate-export` for SQLite installs (kind: mysql-data)
# against real MySQL, using the Ghost Docker image as the destination:
#
#   1. Install the Ghost version shipped in GHOST_IMAGE locally with this CLI (SQLite)
#   2. Seed edge-case rows and run `ghost migrate-export`
#   3. Initialise an empty MySQL database by booting GHOST_IMAGE against it
#   4. Load database.sql, compare every row with the SQLite source
#   5. Boot GHOST_IMAGE on the loaded database and fetch the seeded post
#
# Requires Docker, Node.js and curl. Ports are bound to 127.0.0.1 only.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SCRIPTS="$ROOT/test/e2e/migration"
GHOST_IMAGE="${GHOST_IMAGE:-ghost:6-alpine}"
MYSQL_IMAGE="${MYSQL_IMAGE:-mysql:8.0}"
MYSQL_PORT="${MYSQL_PORT:-33306}"
GHOST_PORT="${GHOST_PORT:-2369}"
WORK="${WORK_DIR:-$(mktemp -d)}"
NAME="ghost-cli-mysql-data-$$"
GHOST_URL="http://localhost:$GHOST_PORT"

cleanup() {
    local status=$?
    if [ "$status" -ne 0 ] && docker inspect "$NAME-ghost" > /dev/null 2>&1; then
        echo "::group::Ghost container logs"
        docker logs "$NAME-ghost" 2>&1 | tail -100 || true
        echo "::endgroup::"
    fi
    node "$ROOT/bin/ghost" stop -d "$WORK/source" > /dev/null 2>&1 || true
    docker rm -f "$NAME-ghost" "$NAME-mysql" > /dev/null 2>&1 || true
    docker network rm "$NAME" > /dev/null 2>&1 || true
    exit "$status"
}
trap cleanup EXIT

wait_for() {
    local description=$1
    shift
    for _ in $(seq 1 90); do
        if "$@" > /dev/null 2>&1; then
            return 0
        fi
        sleep 2
    done
    echo "Timed out waiting for $description"
    return 1
}

start_ghost() {
    docker rm -f "$NAME-ghost" > /dev/null 2>&1 || true
    docker run -d --name "$NAME-ghost" --network "$NAME" -p "127.0.0.1:$GHOST_PORT:2368" \
        -e url="$GHOST_URL" \
        -e database__client=mysql \
        -e database__connection__host="$NAME-mysql" \
        -e database__connection__user=root \
        -e database__connection__password=root \
        -e database__connection__database=ghost \
        "$GHOST_IMAGE" > /dev/null
    wait_for "Ghost to boot on MySQL" curl -fsS "$GHOST_URL/ghost/api/admin/site/"
}

echo "== Resolving $GHOST_IMAGE"
docker pull -q "$GHOST_IMAGE"
GHOST_VERSION="$(docker run --rm --entrypoint node "$GHOST_IMAGE" -p "require('/var/lib/ghost/current/package.json').version")"
echo "Ghost $GHOST_VERSION"

echo "== Installing Ghost $GHOST_VERSION locally (SQLite)"
node "$ROOT/bin/ghost" install "$GHOST_VERSION" --local -d "$WORK/source" --no-prompt
node "$ROOT/bin/ghost" stop -d "$WORK/source"

SQLITE_DB="$WORK/source/content/data/ghost-local.db"
node "$SCRIPTS/seed-sqlite.js" "$SQLITE_DB"

echo "== Exporting"
(cd "$WORK" && node "$ROOT/bin/ghost" migrate-export -d "$WORK/source" --output bundle --force --no-prompt)
BUNDLE="$WORK/bundle"
node -e '
const m = require(process.argv[1]);
if (m.kind !== "mysql-data" || m.ghost.version !== process.argv[2]) {
    throw new Error(`unexpected manifest: ${m.kind} ${m.ghost.version}`);
}' "$BUNDLE/manifest.json" "$GHOST_VERSION"

echo "== Initialising MySQL with $GHOST_IMAGE"
docker network create "$NAME" > /dev/null
docker run -d --name "$NAME-mysql" --network "$NAME" -p "127.0.0.1:$MYSQL_PORT:3306" \
    -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=ghost "$MYSQL_IMAGE" > /dev/null
wait_for "MySQL" docker exec "$NAME-mysql" mysql -uroot -proot -h127.0.0.1 -e 'SELECT 1' ghost
start_ghost
docker stop "$NAME-ghost" > /dev/null

echo "== Loading database.sql"
docker exec -i "$NAME-mysql" mysql -uroot -proot ghost < "$BUNDLE/database.sql"

echo "== Verifying rows"
(cd "$ROOT" && MYSQL_PORT="$MYSQL_PORT" node "$SCRIPTS/verify-mysql-data.js" "$SQLITE_DB" "$BUNDLE")

echo "== Booting Ghost on the loaded database"
start_ghost
SITE="$(curl -fsS "$GHOST_URL/ghost/api/admin/site/")"
if [[ "$SITE" != *"\"version\":\"${GHOST_VERSION%.*}\""* ]]; then
    echo "Unexpected site response: $SITE"
    exit 1
fi
POST="$(curl -fsS "$GHOST_URL/mysql-data-round-trip/" | tr -d "\\000")"
if [[ "$POST" != *"MySQL data round trip"* ]]; then
    echo "Seeded post did not render"
    exit 1
fi

echo "mysql-data round trip passed for Ghost $GHOST_VERSION"
