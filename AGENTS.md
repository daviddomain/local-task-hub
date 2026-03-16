# AGENTS.md

## Mission

Build and maintain Local Task Hub as a local, dockerized, single user application.
No cloud dependency.
No login flow.
No subscription logic.
No multi tenant architecture unless explicitly requested later.

## Project Source of Truth

Use these files as the primary source of truth before making changes:

- MVP.md
- package.json
- components.json
- docker-compose.yml
- tsconfig.json
- next.config.ts
- this AGENTS.md

If instructions conflict, prefer explicit user instructions, then this file, then the rest of the repository.

## Environment safety

- Do not edit files until the local execution environment is confirmed stable.
- If validation commands cannot be executed reliably, stop and report the blocker.

## Stack and Constraints

- Next.js App Router with TypeScript
- React 19
- Tailwind CSS 4
- shadcn/ui only for UI components and primitives
- lucide-react for icons
- MySQL with mysql2 or mysql2/promise
- No ORM unless explicitly requested
- Playwright for meaningful interactive end to end coverage
- Keep dependencies minimal and justified

## Hard Safety Rules

- Never delete, move, overwrite, or modify files outside this repository.
- Never run destructive commands against paths outside the repository root.
- Never use parent directory paths or absolute paths for write or delete operations outside the project.
- Never follow symlinks that resolve outside the repository for write or delete operations.
- If a task appears to require touching files outside the repository, stop and report the blocker instead.
- Never mass delete files to "start fresh".
- Prefer minimal diffs over broad refactors.
- Do not modify secrets or environment files unless the task explicitly requires it and the change is documented.

## Planning and GitHub Workflow

- When asked to plan work, create GitHub Issues first and do not implement anything until explicitly asked.
- Create one atomic issue per task.
- Keep issue titles clear and implementation oriented.
- Include acceptance criteria in each issue.
- Link issues to pull requests.
- Work on one issue at a time unless parallelization is explicitly requested.

## Branch and PR Rules

- Create one branch per issue.
- Use predictable branch names such as:
  - feat/<issue-number>-short-slug
  - fix/<issue-number>-short-slug
  - chore/<issue-number>-short-slug
- Open a draft PR early for implementation tasks.
- Keep PR descriptions concise and include:
  - scope
  - files changed
  - validation performed
  - follow up items if any

## UI Rules

- Use only shadcn/ui components for app level UI building blocks.
- Prefer existing shadcn patterns before creating custom primitives.
- Keep the UI minimal, calm, and information dense.
- Accessibility matters. Use semantic HTML and accessible interaction patterns.
- Prefer Server Components by default.
- Use Client Components only where interactivity requires them.

## Data and Backend Rules

- Use mysql2 or mysql2/promise.
- Use parameterized queries only.
- Keep SQL explicit and readable.
- Organize database access in dedicated server side modules.
- Do not introduce an ORM.
- Do not add external hosted services if a local solution is feasible.

## Testing and Validation

- Run npm run lint for code changes.
- Run npm run build for substantial changes.
- Add Playwright tests for flows with meaningful interaction, state changes, filtering, drag and drop, timers, dialogs, or multi step UX.
- Do not claim tests passed unless they were actually run.
- Report exactly which validations were executed.

## Coding Style

- Prefer small, focused changes.
- Preserve existing project conventions unless there is a strong reason to improve them.
- Avoid premature abstraction.
- Name things clearly and consistently.
- Add brief comments only where the code would otherwise be non obvious.

## Decision Defaults

Unless an issue says otherwise, assume:

- local first implementation
- single user
- desktop first responsive web UI
- no auth
- no ORM
- shadcn/ui only
- Playwright for interactive verification

## When Blocked

If information is missing or a task conflicts with this file:

- stop
- summarize the blocker clearly
- propose the smallest reasonable next step
- do not improvise a risky architecture change silently
