# Migration bundle v1

`ghost migrate-export` exports a Ghost-CLI installation for a separate importer.
The command is **in beta**: keep a backup, and confirm the warning (or explicitly
use `--force`). Only Ghost **6.x** is supported. Bundle v1 is unpublished; there
are no aliases or fallback decoding for earlier drafts.

## Usage and source state

```bash
ghost migrate-export [name] --output /private/exports/rehearsal --archive tgz
ghost migrate-export [name] --output /private/exports/final --archive tgz --leave-stopped
```

- Omit `name` to select the current install; global `--dir` also works.
- `--output`/`-o` is relative to the directory where the command was invoked.
  The default is `ghost-migration-<name>-<timestamp>` there. The parent must
  already exist, and the destination must be outside both the installation and
  its configured content directory. Symlink aliases are resolved for this check.
  `--dir` selects the source but does not change where output paths resolve.
  Existing files/directories, dangling links, and archive collisions are refused.
  When invoked inside the installation, supply an external output destination.
- `--archive tgz|zip` appends that extension to the output path. Both the working
  directory and archive names must be unused. Prefer `tgz` for cross-host moves:
  extract with `tar -xzf bundle.tgz -C /private/target`. Tar omits source ownership.
- `--force`/`-f` skips only the beta confirmation; required with `--no-prompt`.
- `--leave-stopped` selects a final export for cutover. Once source lifecycle
  work begins, the command leaves Ghost stopped on success and attempts to stop
  it on failure, including failure during the portable API export. It never
  automatically restarts a final-export source. Preflight failures and declining
  portable startup leave the original state unchanged.

Ordinary exports restore the original running state on success or failure.
MySQL sources are stopped for copying and dumping, then restarted before
compression if originally running. Portable sources need the API; the command
offers to start a stopped source temporarily and stops it again afterward.
An API failure before a running source was stopped leaves that source running.
Failed stop/start operations are reported; check `ghost ls` before proceeding.

**Recovery:** failed exports remove their partial directory/archive. Fix the
reported error and retry with an unused output path. After a final export, run
`ghost start` **in the source installation** to abandon cutover and resume it.
If lifecycle recovery fails, use `ghost ls` and `ghost start` (ordinary recovery)
or `ghost stop` (final cutover) there. An abrupt process kill or host failure can
leave a private partial output; inspect the source state and remove that partial
output before retrying. Files in the source installation are never deleted.

For cutover, verify the bundle and the isolated destination before switching
DNS/proxy ingress. Keep the source stopped and intact until the destination is
accepted. Restarting the source permits new writes and invalidates the final
snapshot. Docker import, destination verification and routing are S5 work;
this command does not implement them.

## Supported sources and consistency

- `mysql` and `mysql2` produce **`mysql-dump`**. Ghost is stopped before assets
  are copied and `mysqldump --no-tablespaces --single-transaction` runs. The dump
  contains only the selected database's schema/data, no CREATE DATABASE, users
  or grants. External database writers must also be quiescent.
  Configured `database.connection.ssl` (profiles, CA/client certificates or other
  TLS options) is currently unsupported and rejected before creating output or
  changing source state. Use a separately verified TLS-aware migration procedure
  for those sources; do not remove TLS settings to bypass the check. Absent, null
  or boolean-false `ssl` settings are accepted.
- **`portable`** supports only **local SQLite (`sqlite3`) development installs**.
  Unknown/missing clients and production SQLite installations are rejected.
  Content JSON, then members CSV, are downloaded using the existing
  [`lib/tasks/import/`](../lib/tasks/import/) API implementation; Ghost is then
  stopped and assets copied. Both API requests must succeed and both files must
  be present. Content JSON must be nonempty. A successful zero-byte members CSV
  represents a site with no members; the importer should skip member import for
  that file. Missing endpoints and failed downloads remain errors.

Portable captures are **sequential, not an atomic snapshot**. Avoid editing the
site, changing members or uploading/deleting assets throughout export, including
with `--leave-stopped`. No write freeze or Ghost changes are implemented. Final
export stops subsequent writes once Ghost is down; it cannot retroactively make
the earlier API snapshots simultaneous. This is a local development migration
path, not a production SQLite cutover guarantee.

## Manifest and layout

The matching Docker contract is
[`docs/bundle-v1.md`](https://github.com/TryGhost/ghost-docker/blob/next/docs/bundle-v1.md).
Shared manifest fixtures live in `test/fixtures/migration-bundle-v1/`.

```json
{
  "bundleVersion": 1,
  "bundleCreatedAt": "2026-09-14T12:00:00.000Z",
  "sourceInstallType": "production",
  "kind": "mysql-dump",
  "ghost": {"version": "6.2.0"},
  "url": "https://example.com",
  "adminUrl": "https://admin.example.com",
  "database": {"path": "database.sql"},
  "content": "content/",
  "config": {"mail__from": "Ghost Blog <noreply@example.com>"}
}
```

| Field | Contract |
| --- | --- |
| `bundleVersion` | Required, `1`. |
| `bundleCreatedAt` | Required UTC RFC 3339 timestamp of manifest creation; not an atomic snapshot time. |
| `sourceInstallType` | Required `local` or `production`, from the actual instance's `isLocal` process classification, not NODE_ENV or database inference. |
| `kind` | Required `mysql-dump` or `portable`. |
| `ghost.version` | Exact source Ghost 6.x version, including prerelease suffix. Import at this version; upgrade separately. |
| `url` / `adminUrl` | Public URL and optional separate admin URL, preserved without rewriting. |
| `database.path` | Relative path to SQL or content JSON. |
| `database.members` | Required only for portable; relative path to members CSV. |
| `content` | `content/`, relative to bundle root. |
| `config` | Flat map of raw string values. |

For portable bundles, `database` instead contains:

```json
{
  "path": "content/data/content-from-v6.2.0-on-2026-09-14-12-00-00.json",
  "members": "content/data/members-from-v6.2.0-on-2026-09-14-12-00-00.csv"
}
```

Read paths from the manifest, not by globbing. There is no `ghostVersion`,
`sourceEnvironment`, or `database.kind` draft alias.

`content/files`, `images`, `media`, `settings`, and `themes` are copied in full,
including hidden files and default themes. `content/data/redirects.json` and
`redirects.yaml` also travel. Runtime logs, apps, SQLite files, and other data
files do not. Individual theme directory links under `content/themes/` (including
CLI default themes linked through `current`, and external development themes)
are resolved and copied as regular directories. The bundle contains their files,
not links back to the source. Output must also be outside all resolved theme targets.
Broken/cyclic theme links, links to non-directories, nested theme links, other
content links and special files are rejected. Custom adapters and external object
storage are not bundled.

### Configuration values

Objects flatten with `__`; numbers and booleans become strings; arrays are JSON
serialized; null/undefined values are omitted. Values carry **no dotenv quoting
or escaping**. A password `p$ssword` remains `p$ssword`, including the literal `$`.
The importer owns Compose encoding into `ghost.env`. JSON's own string escaping
is still required when writing `manifest.json`.

The exporter excludes `database`, `server`, `logging`, `process`, `paths`, and
`url`. Public/admin URLs remain manifest metadata. The importer deliberately maps
URLs into `.env` and omits container-owned keys from `ghost.env`, including the
flattened `admin__url`. Configuration remains `.env` plus `ghost.env`.

## Portable fidelity and losses

The exporter preserves the API response bytes; it does not interpret, repair or
expand them into a database backup. The API reference is `lib/tasks/import/`:
`db/` for content and `members/upload/?limit=all` for all members. Auth requires
a staff access token on supported Ghost 6 (prompt or `GHOST_CLI_STAFF_AUTH_TOKEN`);
an unconfigured site cannot be exported.

| Data | Portable contract and limitations |
| --- | --- |
| Posts/pages, tags, authors, supported settings and theme settings | Travel in Ghost's content JSON with its supported relationships. Import may remap IDs; this is not database identity preservation. |
| Staff identity/authentication | Author/profile data can travel. Exports may include password hashes, but these are not a reusable authentication backup. Sessions, tokens and staff API credentials do not travel. Ghost’s default content importer locks imported users and assigns random passwords; owner role becomes Administrator. Set up the destination owner and re-establish staff access. |
| Members | All CSV rows travel, including fields the source version emits (email/name/note, labels, timestamps, email subscription flag, complimentary status, tier/customer references). CSV is not the members database. |
| Integrations | Integrations, API keys and webhooks are outside the default content export. Recreate them; raw config secrets do not replace database-stored integration credentials. |
| Paid subscriptions and newsletters | Tier/product definitions and CSV references do not constitute full subscription relationships, billing history or per-newsletter membership. Stripe configuration must be reconnected and references reconciled against the same account by a supported importer; no automatic payment/subscription recovery is promised. |
| Other history | Comments, revisions, email delivery/engagement history, member events and other tables outside the default export are not preserved. |
| Assets | Supported on-disk files are copied byte-for-byte after API export; external storage and omitted runtime/custom directories require separate handling. |

These boundaries were checked against Ghost **6.62.0**'s released exporter
allowlist/blocklist and the existing CLI API implementation. Tests verify bundle
schema, sequencing and response/file preservation. Full destination ID mapping,
staff setup and subscription reconciliation require the S5 importer and its
end-to-end fixtures; S3 does not claim that unimplemented path is qualified.
MySQL dumps preserve database records/relationships without the portable API
losses, but external services and storage still need separate configuration.

## Privacy and verification

Outputs can contain credentials and personal data. Directories are created
`0700`, files and archives `0600` before writing data, including during
compression and failure handling. Secret-like config key names are reported,
never their values. Protect the destination parent against modification by
untrusted users. Delete bundles securely according to the storage system after
migration is accepted.

Run `pnpm test` (includes lint) and `pnpm lint`. To include the real Compose
container round trip using ghost-docker's actual serializer:

```bash
GHOST_DOCKER_DIR=/path/to/ghost-docker pnpm test
```

This requires Docker, Compose, bash, jq, and the `alpine:3.20` probe image. The
ordinary suite always tests real tgz creation/system-tar extraction, raw values,
shared manifest fixtures, private permissions, collisions, quoted shell paths,
lifecycle recovery, final exports and unsupported portable cases.
