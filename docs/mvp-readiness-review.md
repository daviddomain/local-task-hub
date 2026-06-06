# MVP Readiness Review

Review date: 2026-06-06

Scope: review-only comparison of the current repository state against `MVP.md`, `README.md`, `AGENTS.md`, source code, Playwright coverage, and recent merged issue/PR history. No product code changes were made.

## 1. Fulfilled MVP areas

- **Local-first single-user runtime:** The app uses Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui primitives, `mysql2/promise`, and local MySQL through Docker Compose. Core app data is local and persisted through the `mysql-data` Docker volume.
- **App shell and main workflow:** The home route provides a desktop-oriented dark-mode workspace with search, filters, Quick Add, today summary, recently opened tasks, and a central task list.
- **Quick task capture:** Quick Add requires only title and supports optional note, first link, tags, people references, and starting time tracking immediately.
- **Task list visibility:** Task rows show title, status, later marker, tags, people references, note preview, running/stopped state, today/total time, and local source badges derived from attached links. Multiple known source badges are now visible with an overflow count.
- **Task detail editing:** The task detail dialog supports title, status, later, note, links, tags, people references, time sessions, created/updated metadata, done/reopen, and single-task Markdown export.
- **Time tracking core:** Tasks can start and stop tracking, running sessions are visible, sessions persist in MySQL, totals are shown per task and for today, and time sessions can be edited or removed afterward with readable duration display.
- **Search and filters:** Search covers title, note, tags, people, and URLs. Filters cover status, later, person, tag, time relation, and source, and can be combined.
- **Exports:** Single-task Markdown export and active/open-task JSON export are implemented and covered by Playwright.
- **Meaningful Playwright coverage:** Current `e2e/` specs cover create/edit persistence, search/filtering, exports, time tracking including session editing, clickable links/source badges, recently opened tasks, and done/reopen behavior. CI runs Chromium Playwright against MySQL using the official Playwright image.
- **Scope boundaries:** No auth, multi-user, cloud sync, external API integration, browser extension, AI feature, ORM, or reporting dashboard is present in the core app surface.

## 2. Open MVP gaps

- **Pause vs. stop semantics are not clearly covered.** `MVP.md` requires start, pause, and stop per task. The current user-visible workflow exposes Start tracking and Stop tracking only. If "stop" is intended to satisfy "pause" for Phase 1, that should be made explicit; otherwise this is a true MVP gap.
- **Backup guidance is incomplete.** `MVP.md` says backup should be possible through volume backup or `mysqldump`. `docs/local-mysql.md` documents persistence, reset, and E2E cleanup, but not a concrete backup/restore or `mysqldump` workflow.
- **Markdown note display is basic.** Notes are stored as markdown text and shown in a plain `<pre>` preview. This satisfies the "plain markdown input and display" bar at a minimal level, but there is no rendered markdown preview. Treat as acceptable unless "display" is interpreted as rendered markdown.

Polish rather than MVP gaps:

- No keyboard shortcut is visible for Quick Add, but `MVP.md` marks it optional.
- The today summary is intentionally simple and current-day only, which matches Phase 1.
- Export is present as endpoints and buttons, even though export discoverability could improve.

## 3. UI/UX polish topics

- **Visible mojibake in task rows:** The task time line renders a mojibake sequence instead of a clean dot separator. This is small but user-visible in a frequently scanned row.
- **Filter interaction is serviceable but not frictionless:** Filters are combinable, but selecting values then pressing Apply is slower than a local daily-use tool might eventually want. This should not block MVP.
- **Task detail remains dense:** The dialog is usable and scrollable, but time sessions, exports, metadata, links, and status actions all share one long form. Future polish should stay narrow and avoid redesign.
- **Export discoverability is uneven:** Open JSON export is visible in the shell, while Markdown export is inside the task detail dialog. This is acceptable for MVP but worth watching in real use.

## 4. Technical stability / maintainability topics

- **Playwright suite location is aligned.** `playwright.config.ts` uses `testDir: './e2e'`, and the stale `tests/` specs from the readiness review were removed so future validation points at the active suite.
- **Core workflow files are still large.** `src/app/page.tsx`, `src/lib/server/tasks.ts`, and `src/components/task-detail-dialog-content.tsx` carry a lot of behavior. This is manageable now after the home route split, but future changes should keep using small issue-driven extractions.
- **Fallow is useful only as manual review support for now.** The documented Fallow evaluation found unused shadcn/ui-style files, one possible unused dependency, and duplicated E2E setup. These are useful signals but should not become a CI gate yet.
- **E2E setup is duplicated across specs.** This is not currently blocking, but repeated Quick Add/DB helper patterns increase maintenance cost. Any helper extraction should preserve the clarity of per-spec setup.
- **Encoding cleanup is worth a small docs/UI pass.** `MVP.md`, `docs/local-mysql.md`, and task-row UI output show mojibake in places. This is low risk but should be handled separately from product feature work.

## 5. Recommended next 1-3 issues

### Issue 1: Clarify and close the pause/stop time-tracking MVP semantics

- **Why it matters:** `MVP.md` explicitly names start, pause, and stop, while the product currently exposes Start/Stop only.
- **Type:** MVP-blocking unless the product decision is that Stop is the Phase 1 pause/stop action.
- **Scope boundary:** Decide and document the Phase 1 semantics first. If code changes are needed, keep them limited to the task row/detail time-tracking controls and focused Playwright coverage. Do not add reports, dashboards, billing-style timers, or broad time-tracking redesign.

### Issue 2: Document local backup and restore for MySQL data

- **Why it matters:** Local persistence is central to the MVP, and `MVP.md` explicitly mentions volume backup or `mysqldump`.
- **Type:** MVP documentation gap.
- **Scope boundary:** Update `docs/local-mysql.md` and README links only. Include preview-safe commands for `mysqldump` and restore against this project database. Do not add app-level backup automation, cloud sync, or database reset infrastructure.

### Issue 3: Remove or reconcile stale Playwright tests outside `e2e/` - resolved

- **Resolution:** Removed the stale `tests/` specs so Playwright validation is centered on the configured `e2e/` suite.
- **Type:** Polish / maintainability.
- **Scope boundary:** No Playwright CI strategy, DB reset infrastructure, or active E2E suite rewrite was needed.
