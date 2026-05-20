# Local Task Hub

Local Task Hub is a local-first, dockerized, single-user app for daily development work. It helps one technical user capture tasks, notes, links, tags, people references, and time sessions without cloud dependencies.

Phase 1 focuses on quick task capture, task detail editing, lightweight time tracking, search and filtering, source/link visibility, and simple export.

## Phase 1 Boundaries

Phase 1 intentionally does not include auth or login, multi-user support, cloud sync, SaaS or subscription logic, third-party API integrations, or an ORM.

## Tech Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui
- MySQL via Docker Compose
- `mysql2` / `mysql2/promise`
- Playwright

## Local Setup

Install dependencies:

```bash
npm install
```

Start the local MySQL database:

```bash
docker compose up -d db
```

Run the development server:

```bash
npm run dev
```

Open the app at:

```text
http://localhost:3000
```

## Database Notes

MySQL runs through Docker Compose and stores data in the named Docker volume declared in `docker-compose.yml`, so local data survives container restarts and `docker compose down`.

For health checks, persistence details, and safe reset steps, see [docs/local-mysql.md](docs/local-mysql.md).

## Validation

Canonical local checks:

```bash
npm run lint
npm run build
```

Playwright is configured for meaningful interactive flows under `e2e/`. Use focused runs when validating a change:

```bash
npx playwright test --project=chromium
npx playwright test e2e/<spec-name>.spec.ts --project=chromium --reporter=line
```

CI currently runs the Chromium Playwright project against a MySQL service.

## Project Docs

- [MVP.md](MVP.md) is the product source of truth for Phase 1.
- [AGENTS.md](AGENTS.md) contains Codex and project-agent guidance.
- [docs/local-mysql.md](docs/local-mysql.md) documents the local MySQL setup.

## Exports And Local Data

Phase 1 includes simple local export capabilities: a single task can be exported as Markdown, and open or active tasks can be exported as JSON.

Core app data is local and persisted in MySQL through the Docker volume.
