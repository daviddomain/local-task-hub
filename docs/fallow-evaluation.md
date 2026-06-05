# Fallow Evaluation

## Context

Issue #59 evaluates whether Fallow is useful for Local Task Hub as a local
codebase health and review-support tool. This first pass intentionally does not
add a CI gate, baseline, suppression file, package change, or cleanup refactor.

Note: `fallow` was already present in `devDependencies` before this evaluation.
The commands below were still run through `npx fallow ...` as requested.

## Commands Run

From the repository root on branch `chore/59-fallow-evaluation`:

```powershell
npx fallow audit
npx fallow health --score --hotspots --targets
npx fallow dead-code
npx fallow dupes
```

## Findings

### Audit

`npx fallow audit` compared the branch against `main` and reported no issues in
0 changed files. This is expected for the first command because the branch had no
source changes at that point.

### Health

`npx fallow health --score --hotspots --targets` reported:

- Health score: `58 C`.
- Main deductions: dead files, hotspots, unit size, unused dependencies, dead
  exports, maintainability, coupling, and duplication.
- Maintainability: `83.0`, categorized by Fallow as moderate.
- One primary churn hotspot: `src/app/page.tsx`.
- Notable large functions:
  - `TaskDetailDialogContent` in `src/components/task-detail-dialog-content.tsx`.
  - `Home` in `src/app/page.tsx`.
  - `listTasks` and `updateTaskDetail` in `src/lib/server/tasks.ts`.
  - `TaskList` in `src/components/task-list.tsx`.
  - `TaskFilters` in `src/components/task-filters.tsx`.
- Top refactoring targets were mostly unused shadcn/ui-style components or
  exports, plus complexity in `src/app/page.tsx`.

The health output is useful for triage, but should not be treated as a mandate
to immediately refactor broad app surfaces. Several larger files are also core
workflow files where changes should remain issue-driven and covered by focused
tests.

### Dead Code

`npx fallow dead-code` exited with findings:

- 47 unused files.
- 17 unused exports.
- 1 unused dependency: `date-fns`.

Many unused-file findings point at `src/components/ui/*` primitives. These are
likely framework/convention findings rather than immediate defects because the
project uses shadcn/ui, where generated primitives can exist before they are
consumed by app flows.

The `date-fns` dependency finding is more concrete and should be checked in a
separate dependency-hygiene issue before removal. Removing it in this evaluation
would go beyond the issue scope.

### Duplication

`npx fallow dupes` reported 32 clone groups and 567 duplicated lines, or 5.2% of
analyzed code.

The strongest signal is duplicated Playwright setup and workflow code across
E2E specs, especially:

- `e2e/time-tracking.spec.ts`
- `e2e/create-task.spec.ts`
- `e2e/export.spec.ts`
- `e2e/task-complete-reopen.spec.ts`
- `e2e/task-detail-links.spec.ts`
- `e2e/search-filtering.spec.ts`
- `e2e/recently-opened.spec.ts`

This looks useful, but any extraction should be done carefully. The current E2E
tests often encode local MySQL state assumptions and user workflow details, so a
shared helper should only be introduced when it reduces duplication without
hiding important test setup.

## Usefulness For This Project

Fallow looks useful as an occasional local review-support tool. Its strongest
signals for Local Task Hub are:

- spotting large core files before they become harder to change safely;
- identifying duplicated E2E setup that could become a small test-helper
  follow-up;
- surfacing dependency-hygiene candidates;
- giving a quick changed-code audit for PR review context.

Its weakest signals are:

- generated or currently unused shadcn/ui primitives being classified as dead
  files;
- broad refactoring targets that would be risky if acted on outside a focused
  issue;
- health scoring that can overemphasize unused UI surface in a small MVP repo.

## Recommendation

Adopt Fallow further, but only in a staged local workflow for now:

1. Keep using `npx fallow audit` manually on focused PR branches.
2. Use `npx fallow health --score --hotspots --targets` periodically during
   stabilization planning.
3. Create separate follow-up issues for low-risk findings instead of fixing them
   inside evaluation work.
4. Do not add a CI gate, baseline, broad ignore list, or suppression strategy
   yet.

Suggested follow-up issues:

- Review whether `date-fns` is still needed and remove it only if normal
  validation passes.
- Extract a small Playwright helper for repeated task creation/setup patterns if
  it keeps tests clearer.
- Split high-churn core UI/server functions only when a feature or bugfix is
  already touching that area.

