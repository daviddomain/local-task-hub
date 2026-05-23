# Local MySQL (Phase 1)

This project uses a **local-only**, **single-user** MySQL container for Phase 1.
There is no cloud dependency in the core runtime.

## Stack constraints

- Database driver for app code: `mysql2` / `mysql2/promise`
- ORM usage: **not allowed** for Phase 1

## Start services

From the repository root:

```bash
docker compose up -d db
```

Optional (includes DB browser UI):

```bash
docker compose up -d
```

## Stop services

```bash
docker compose stop
```

To stop and remove containers/networks (keeps DB data volume):

```bash
docker compose down
```

## Confirm DB health and connectivity

1. Check container and health state:

```bash
docker compose ps
```

Expected for `db`: `Up ... (healthy)`

2. Confirm MySQL responds from inside the container:

```bash
docker compose exec -T db mysqladmin -uroot -plocaltaskhub ping
```

Expected output: `mysqld is alive`

## Persistence behavior

MySQL data is persisted in the named Docker volume declared in `docker-compose.yml`:

- `mysql-data:/var/lib/mysql`

That means data survives container restarts and `docker compose down`.

## Clean up local E2E-created tasks

Use this only for a local development database when repeated Playwright runs have
created many test tasks. The current E2E specs use task titles that start with an
issue-style prefix such as `Issue2`, `Issue10`, or `Issue36`; this workflow only
targets titles matching `^Issue[0-9]+` by default.

Preview the matching records before deleting anything:

```bash
docker compose exec -T db mysql -uroot -plocaltaskhub local-task-hub -e "SELECT COUNT(*) AS issue_test_tasks FROM tasks WHERE title REGEXP '^Issue[0-9]+';"
docker compose exec -T db mysql -uroot -plocaltaskhub local-task-hub -e "SELECT id, title, status, created_at, updated_at FROM tasks WHERE title REGEXP '^Issue[0-9]+' ORDER BY created_at DESC LIMIT 50;"
```

Check what would be preserved:

```bash
docker compose exec -T db mysql -uroot -plocaltaskhub local-task-hub -e "SELECT COUNT(*) AS non_issue_tasks FROM tasks WHERE title NOT REGEXP '^Issue[0-9]+';"
docker compose exec -T db mysql -uroot -plocaltaskhub local-task-hub -e "SELECT id, title, status, created_at, updated_at FROM tasks WHERE title NOT REGEXP '^Issue[0-9]+' ORDER BY created_at DESC;"
```

Delete only after the preview confirms that the matching rows are disposable
local E2E artifacts:

```bash
docker compose exec -T db mysql -uroot -plocaltaskhub local-task-hub -e "DELETE FROM tasks WHERE title REGEXP '^Issue[0-9]+';"
```

Verify the remaining task count:

```bash
docker compose exec -T db mysql -uroot -plocaltaskhub local-task-hub -e "SELECT COUNT(*) AS remaining_tasks FROM tasks;"
```

Related rows in `task_links`, `task_tags`, `task_person_references`,
`task_time_sessions`, and `task_recent_opens` are removed by the schema's
existing `ON DELETE CASCADE` foreign keys when the parent `tasks` rows are
deleted. Do not broaden the `WHERE` clause unless you intentionally want to
delete manual local tasks too.

## Application DB module behavior (server-side)

The application uses a dedicated server-side module at `src/lib/server/db.ts`.

- Driver: `mysql2/promise`
- Access pattern: pooled connections via a shared singleton pool
- Query safety: pass values as query parameters (`?`) through the `params` argument
- Runtime guard: module is marked `server-only` and must not be imported by client components
- Failure behavior: connection failures are mapped to `DatabaseUnavailableError` with guidance to verify local Docker and DB settings

## Safe local DB reset (project-scoped)

Use this only when you intentionally want a clean local DB.

1. Stop and remove project containers:

```bash
docker compose down
```

2. Remove this project's DB volume only:

```bash
docker volume rm local-task-hub_mysql-data
```

3. Start DB again (fresh init):

```bash
docker compose up -d db
```

This reset is scoped to this project’s named volume and does not touch other Docker volumes.
