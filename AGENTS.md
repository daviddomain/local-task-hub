# AGENTS.md

Codex guidance for Local Task Hub.

## Project Summary

Local Task Hub is a local-first, dockerized, single-user application for daily development work. It helps one technical user capture tasks, notes, links, tags, people references, and time sessions without cloud dependencies, login flows, subscriptions, or multi-tenant architecture.

Keep Phase 1 small, robust, local-first, single-user, and desktop-oriented.

## Product Source of Truth

- `MVP.md` is the product source of truth.
- Do not use `MVP-agent-friendly.md`.
- This project uses `MVP.md` only.

Before planning or implementing, inspect the relevant source-of-truth files:

- `MVP.md`
- `package.json`
- `components.json`
- `docker-compose.yml`
- `tsconfig.json`
- `next.config.ts`
- `playwright.config.ts`
- this `AGENTS.md`

If instructions conflict, prefer explicit user instructions, then this file, then the rest of the repository.

## Tech Stack

- Next.js App Router with TypeScript
- React 19
- Tailwind CSS 4
- shadcn/ui for app-level UI components and primitives
- lucide-react for icons
- MySQL in local Docker
- `mysql2` or `mysql2/promise` for database access
- Playwright for meaningful interactive end-to-end coverage

Do not introduce an ORM. Keep dependencies minimal and justified.

## Scope Rules

- Work one issue at a time unless the user explicitly asks for parallel work.
- Keep diffs small, reviewable, and limited to the issue.
- Do not broaden scope or silently add Phase 2 features.
- Do not add dependencies unless clearly necessary.
- Do not add production-only code just to support tests.
- Do not introduce cloud sync, auth, multi-user support, external integrations, reporting features, subscriptions, or billing unless the issue explicitly asks for them.
- Prefer explicit SQL and existing server-side database modules.
- Use parameterized queries only.
- Keep database access in dedicated server-side modules.
- Prefer Server Components by default; use Client Components only where interactivity requires them.
- Use shadcn/ui patterns before creating custom primitives.
- Keep the UI calm, minimal, accessible, and information dense.

If a change feels architectural or broad, stop and reduce scope before editing.

## Development Workflow

- Confirm the repository and execution environment are stable before editing files.
- Use Windows-compatible commands and paths in this repository.
- Do not assume WSL, POSIX utilities, or Linux paths are available.
- For planning requests, create or refine GitHub issues only; do not implement until asked.
- For implementation requests, work from a clean tree on a dedicated issue branch when possible.
- Preserve existing project conventions and formatting.
- Add comments only where the code would otherwise be non-obvious.
- Do not modify secrets or environment files unless explicitly requested.

## Validation Commands

For code changes:

- Run `npm run lint`.
- Run `npm run build` for substantial changes.
- Run focused Playwright coverage for meaningful interactive flows.

For documentation-only guidance changes, run the exact validation requested by the issue or user. Do not claim tests passed unless they were actually run.

## Playwright Guidance

- Prefer focused Playwright specs for meaningful interaction, state changes, filtering, timers, dialogs, persistence, and multi-step UX.
- Do not rely on local fake data being absent.
- Do not add DB reset infrastructure unless explicitly requested.
- Do not keep brittle viewport hacks, artificial waits, direct href navigation, or timeout increases just to force a test through.
- If a test becomes dominated by layout workarounds, stop and report the blocker.

## Files and Paths to Avoid

Do not edit these unless the issue explicitly asks for them:

- app source code outside the issue scope
- tests outside the issue scope
- database schema or migration files
- Docker runtime behavior
- package dependencies
- secrets, environment files, certificates, or private keys
- generated output such as `.next/`, `coverage/`, `playwright-report/`, and `test-results/`

Never delete, move, overwrite, or modify files outside this repository. Never mass-delete files to start fresh.

## Final Report Expectations

Final reports should include:

- files changed
- key behavior or guidance changed
- validation commands run and their exact results
- any tests intentionally not run, with the reason
- blockers, risks, or follow-up items if present

