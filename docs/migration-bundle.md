# Migration bundle format

`ghost migrate-export` turns a Ghost-CLI install — local or production — into a
portable **migration bundle**. Ghost-CLI owns the export; an importer (today
[`TryGhost/ghost-docker`](https://github.com/TryGhost/ghost-docker)) owns the other
half. The bundle described here is the entire contract between the two: Ghost-CLI
knows nothing about the importer's layout, and the importer never needs to read the
source install.

This command is **in beta**. It prints a warning and requires explicit confirmation
before it does any work.

It only supports **Ghost 6.x** installs. Older majors have different config and
content layouts, so the command refuses rather than emitting a bundle the importer
can't safely consume. Update the install to Ghost 6 first, then export.

## Usage

```bash
ghost migrate-export [name] [--output <path>] [--archive tgz|zip] [--force]
```

- `name` — an instance from the global registry (`~/.ghost/config`, the same list
  `ghost ls` prints). Omit it to use the install in the current directory, or use the
  global `--dir`/`-d` flag to point at one directly.
- `--output`/`-o` — where to write the bundle. Defaults to
  `./ghost-migration-<instance-name>-<timestamp>` in the directory the command was
  run from.
- `--archive` — emit a single `.tgz` or `.zip` instead of a directory. Prefer `tgz`
  for moving a bundle between hosts: `tar` is available everywhere, while `unzip`
  frequently isn't installed on a minimal server image (ghost-docker's own
  `migrate.sh` doesn't list it as a required command). Tarballs are also written with
  node-tar's `portable` flag, so the source host's uid/gid and username don't travel.
  The archive is transport only — the contents are identical either way, and an
  importer is free to accept only the unpacked directory.
- `--force`/`-f` — skip the beta confirmation. Required when running with the global
  `--no-prompt`, which otherwise aborts rather than assuming consent.

The export is non-destructive and re-runnable. Nothing in the source install is
modified or deleted, so the rollback is "the original is still there". Ghost is
stopped for the duration of the copy so the export is consistent, then restarted if
it was running to begin with.

## Layout

```
<bundle>/
  manifest.json
  database.sql          # `mysql-dump` bundles only
  content/
    data/               # redirects, plus the content/members exports for `portable` bundles
    files/
    images/
    media/
    settings/
    themes/
```

`content/` is laid out exactly as Ghost expects its content directory, so an importer
can mount or copy it straight in. `content/logs/` and any SQLite database file are
deliberately left behind.

## `manifest.json`

```json
{
  "bundleVersion": 1,
  "ghostVersion": "6.2.0",
  "sourceEnvironment": "production",
  "url": "https://example.com",
  "adminUrl": "https://admin.example.com",
  "database": { "kind": "mysql-dump", "path": "database.sql" },
  "content": "content/",
  "config": {
    "mail__transport": "SMTP",
    "mail__options__host": "smtp.example.com"
  }
}
```

| Field | Notes |
| --- | --- |
| `bundleVersion` | Currently `1`. Bumped on any breaking change to this shape. |
| `ghostVersion` | Version of Ghost the bundle was taken from. Always a 6.x version. |
| `sourceEnvironment` | `production` or `development` — which config the export read. |
| `url` | The site's `url` config value. |
| `adminUrl` | Omitted entirely when the install has no separate admin URL. |
| `database` | How the data travels. See below. |
| `content` | Always `content/`. Relative to the bundle root. |
| `config` | The install's Ghost config, flattened to env-var form. See below. |

### `database`

`database.kind` is always explicit — an importer never has to guess.

**`mysql-dump`** — the source was MySQL. Lossless, no API round-trip, no ID churn.

```json
{ "kind": "mysql-dump", "path": "database.sql" }
```

`path` is a `mysqldump --no-tablespaces --single-transaction` of the source database,
relative to the bundle root. It contains schema and data for that database only; no
`CREATE DATABASE`, no users, no grants.

**`portable`** — the source was anything else (in practice SQLite, which is what
`ghost install local` uses). Ghost 7 drops sqlite3 support, so a local install's data
has to arrive in a form that can land in MySQL. This is Ghost's own JSON content
export plus the members CSV, taken over the admin API. Database-agnostic but lossier,
and it requires the instance to be running — the command offers to start it.

```json
{
  "kind": "portable",
  "path": "content/data/content-from-v6.2.0-on-2026-09-01-12-30-00.json",
  "members": "content/data/members-from-v6.2.0-on-2026-09-01-12-30-00.csv"
}
```

Both paths are relative to the bundle root, and both files also sit inside `content/`
where Ghost's own importer expects to find them. Filenames carry a version/timestamp
suffix, so read them from the manifest rather than globbing.

There is no SQLite→MySQL dump translation, and there never will be in this command.

### `config`

The install's Ghost config, flattened to Ghost's `section__key` env-var form. This
matches ghost-docker's `scripts/config-to-env.js` byte for byte, so its output can be
written straight into an env file:

- nested objects join with `__` (`mail.options.host` → `mail__options__host`)
- arrays become JSON strings
- booleans and numbers become strings
- `null`/`undefined` values are dropped
- values containing a space, newline, `"` or `'` are wrapped in double quotes, with
  inner backslashes and double quotes backslash-escaped — **the quotes are part of the
  value in the JSON**, they are not JSON quoting

These top-level sections are excluded, because they describe how Ghost was run
outside a container and are actively wrong inside one:

`database`, `server`, `logging`, `process`, `paths`, `url`

Excluding `database` also keeps the source database credentials out of the bundle.

## Handling the bundle

Other config *can* legitimately carry secrets — `mail__options__auth__pass` being the
obvious one, which has to travel for the migrated site to send email. The command
lists any such keys when it finishes, and writes the bundle `0700`/`0600`. Treat a
bundle as sensitive and delete it once the import is done.

## Divergences from the original proposal

- **`database.members`** was added for `portable` bundles. The proposed shape only had
  `database.path`, which leaves no way to locate the members CSV.
- **Themes are copied in full**, including `casper` and `source`. `ghost backup`
  excludes the default themes; a migration that dropped the site's active theme would
  break it, so fidelity wins here.
- **Backslashes are escaped inside quoted config values.** ghost-docker's
  `scripts/config-to-env.js` escapes `"` but not `\`, so a value like `pa$$\word here`
  emits `"pa$$\word here"` — the backslash is then eaten by the consumer's escape
  processing, and a value *ending* in `\` escapes its own closing quote and runs into
  the next line. Ghost-CLI escapes `\` first. Output is identical for values without
  backslashes, which is nearly all of them. Worth fixing upstream too.
- **`--single-transaction`** is passed to `mysqldump` (ghost-docker's `migrate.sh`
  does not). Ghost is already stopped by then, so it costs nothing and protects
  anything else still writing.
