# Local Task Hub – Agent-Friendly MVP

## Purpose

Local Task Hub is a slim, local, dockerized single-user application for daily development work.

It is meant to reduce context switching across tickets, repositories, chats, notes, and time tracking without becoming another heavy tool.

This document is the product source of truth for Phase 1.

---

## Product Summary

The application is a personal work hub for one technical user.

It should make it fast to:

- capture tasks
- attach notes and links
- track time per task
- find things again quickly through search and filters
- keep all core data local

The product is intentionally local first, minimal, and desktop oriented.

---

## Core Principles

- Fast capture beats perfect structure
- Search and filters matter more than hierarchies
- Minimal required input
- Local persistence with no cloud dependency
- Calm, information-dense UI
- Time tracking should feel lightweight
- Keep Phase 1 small, robust, and reviewable

---

## Target User

A single technically experienced user who works daily with:

- Jira or similar ticket systems
- GitLab or GitHub repositories
- chat context
- notes and snippets
- manual time tracking

This is not a team tool.

---

## Hard Scope Boundaries

These are out of scope for Phase 1:

- multi-user support
- authentication, login, roles, permissions
- cloud sync
- SaaS billing or subscription logic
- Jira, GitLab, GitHub, Slack, or email API integrations
- browser extension
- AI features
- mobile-first UX
- complex reporting
- ORM introduction
- drag and drop task ordering
- rich text editor
- syntax highlighting
- favicon fetching from remote services

If a feature is not clearly described as part of Phase 1, it should not be added.

---

## Technical Direction

### Required Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui for UI components
- MySQL in local Docker setup
- `mysql2` or `mysql2/promise` for database access
- Playwright for meaningful interactive end-to-end flows

### Technical Constraints

- single-user only
- local dockerized runtime
- no ORM
- explicit SQL queries
- database access kept in dedicated server-side modules
- desktop first
- dark mode required
- keep dependencies minimal and justified

### Persistence

- data lives in local MySQL
- persistence is provided through Docker volumes
- backup should be possible through volume backup or `mysqldump`
- app-level export is still part of the MVP for core user data

---

## Core Domain Objects

### Task

A task is the central object.

A task contains:

- title
- status
- optional later flag
- note
- tags
- person references
- links
- time sessions
- created timestamp
- updated timestamp

### Time Session

A time session belongs to one task and contains:

- start time
- end time
- duration

### Tag

A free text label such as:

- `bug`
- `frontend`
- `review`
- `security`

### Person Reference

A simple free reference such as:

- `@anna`
- `@max`

No separate contacts module is part of Phase 1.

### Link

A URL attached to a task, for example:

- Jira ticket
- GitLab merge request
- GitHub issue
- Confluence page
- arbitrary URL

---

## Status Model

Phase 1 uses this fixed status set:

- `open`
- `in_progress`
- `blocked`
- `waiting`
- `review`
- `done`

There is also a separate boolean `later` marker.

This means a task can be:

- `blocked` and `later`
- `open` and `later`
- `review` without `later`

The `later` flag must not replace the actual status.

---

## Phase 1 Feature Scope

## 1. App Shell

The app needs a stable shell that supports the core workflow.

### Requirements

- desktop-friendly layout
- dark mode
- central task list area
- visible search input
- visible filter controls
- clear entry point for creating a task
- useful empty state

### Default List Behavior

- main list sorted by `updated_at` descending
- separate small area for recently opened tasks
- no drag and drop ordering in Phase 1

---

## 2. Task List

The task list is the main working view.

Each task should be shown in a compact row or card.

### Visible Information per Task

- title
- status
- optional later marker
- tags
- person references
- short note preview
- time information
- source badge derived from attached links where possible

### Time Information Examples

- `running now`
- `2h 14m today`
- `5h 40m total`

### Source Badges

Known domains may map to a local badge or icon, for example:

- Jira
- GitLab
- GitHub
- Confluence

Unknown sources may use a generic fallback.

Do not fetch favicons remotely in Phase 1.

---

## 3. Task Creation and Quick Add

Creating a task must be extremely fast.

### Requirements

- obvious create button
- optional keyboard shortcut
- only the title is required

### Optional at Creation Time

- note
- first link
- first tags
- first person references
- start time tracking immediately

### Goal

A new task should be creatable in a few seconds.

---

## 4. Task Detail View

Each task needs a detail view, for example a sheet, dialog, or split view.

### Contents

- title
- status
- later marker
- note
- links
- tags
- person references
- time sessions
- metadata such as created and updated timestamps

### Notes

- notes are stored as markdown text
- Phase 1 only needs plain markdown input and display
- no advanced rich text editor

### Snippets

- snippets may be stored in the note area or in a simple dedicated field or section
- simple monospace presentation is enough in Phase 1
- no syntax highlighting required

---

## 5. Time Tracking

Time tracking is a core feature.

### Requirements

- start per task
- pause per task
- stop per task
- running session clearly visible
- sessions stored durably
- totals per task and for today

### Editing

Time sessions must be editable afterwards so a forgotten stop can be corrected.

Do not enforce an arbitrary edit limit such as a fixed number of hours.

### Daily Overview

There should be a simple today view or summary that makes it easy to see booked time for the current day.

A simple table or list is enough for Phase 1.

---

## 6. Search and Filters

Search and filters are central to the product.

### Global Search

The live search should cover:

- title
- note
- tags
- person references
- URLs

### Filters

Combinable filters for:

- status
- later
- person
- tags
- time relation
- source

### Time Filters in Phase 1

- today
- this week
- no time
- recently updated

### Source Filters in Phase 1

Filter for tasks with at least one link from a known source, for example:

- Jira
- GitLab
- GitHub
- Confluence
- other

### Not in Phase 1

- saved views
- advanced query language
- external full-text engine

---

## 7. Export

Phase 1 includes simple export.

### Required Exports

- single task as markdown
- active or open tasks as JSON

### Nice but Optional Within Phase 1

- markdown table export for multiple tasks

### Not in Phase 1

- PDF export
- automatic cloud backup
- imports from third-party systems

---

## UX and Quality Requirements

### UX

- simple
- calm
- readable
- low-friction interactions
- good dark mode readability

### Performance

- fast local startup and navigation
- smooth list interaction for normal single-user data sizes
- avoid heavy libraries without strong reason

### Accessibility

- semantic HTML
- keyboard-usable controls
- clear focus states
- dialogs and sheets should follow accessible patterns

---

## Test Strategy

Playwright should cover meaningful interactive flows.

### Phase 1 Flows Worth Testing

- create task
- edit task
- find task through search
- filter tasks
- start time tracking
- stop time tracking
- edit a time session
- verify persistence after reload

### Not Required

- trivial visual-only details without interaction logic
- exhaustive E2E coverage for every simple UI element

---

## Phase 1 Definition of Done

Phase 1 is complete when:

- a task can be created quickly
- a task can be fully edited
- notes, links, tags, person references, and time sessions are stored per task
- time tracking works reliably
- the task list supports search and filters
- data persists locally in MySQL
- the app runs in the intended local Docker setup
- the UI is built with shadcn/ui-based components
- core interactive flows are covered by Playwright
- no cloud dependency is required for core functionality

---

## Recommended Implementation Order

1. project bootstrap and local runtime alignment
2. database connection layer with MySQL and `mysql2`
3. schema and persistence for tasks and time sessions
4. app shell and navigation structure
5. task list and task creation
6. task detail editing
7. time tracking workflow
8. search and filters
9. export
10. Playwright coverage for core flows

---

## Suggested Planning Breakdown for GitHub Issues

The MVP should be split into small, reviewable issues.

### Epic 1: Foundation

- align project scaffolding with MVP direction
- add database access layer with `mysql2`
- define initial schema and migration/init strategy
- configure local environment contract for app and database

### Epic 2: App Shell

- build base layout
- implement dark mode-ready shell
- create empty states and entry points

### Epic 3: Task Core

- create task model and persistence
- implement task list
- implement quick add
- implement task detail editing

### Epic 4: Time Tracking

- create time session persistence
- implement start, pause, stop actions
- implement session editing and summaries

### Epic 5: Search, Filters, and Source Mapping

- global search
- filter model
- source badge mapping from URLs

### Epic 6: Export and Validation

- markdown export
- JSON export
- Playwright coverage for core interactive flows

Each issue should contain:

- clear scope
- acceptance criteria
- dependencies if relevant
- explicit boundaries when useful

---

## Phase 2 Candidates

These are intentionally postponed:

- saved filter views
- browser extension
- global snippet library
- weekly and monthly reports
- more keyboard shortcuts
- better markdown preview
- syntax highlighting
- drag and drop ordering
- more export formats
- third-party integrations
- AI-assisted writing features

---

## Final Product Positioning

Local Task Hub is intentionally not a large platform.

It is a personal, local work companion focused on:

- quick capture
- clear visibility
- lightweight time tracking
- excellent findability
- local persistence

Anything that threatens that simplicity should stay out of Phase 1.
