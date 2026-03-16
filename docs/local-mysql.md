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
