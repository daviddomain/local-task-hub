import "server-only"

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise"

import { getDbPool } from "@/lib/server/db"

const LIST_SEPARATOR = "\u001F"

const TASK_STATUSES = ["open", "in_progress", "blocked", "waiting", "review", "done"] as const

type TaskStatus = (typeof TASK_STATUSES)[number]

const MAX_RECENTLY_OPENED_TASKS = 5

let hasEnsuredTaskRecentOpensTable = false

export type TaskSourceType = "jira" | "gitlab" | "github" | "confluence" | "other"

export type TaskTimeRelationFilter = "today" | "this_week" | "no_time" | "recently_updated"

export type TaskListFilters = {
  query?: string
  status?: TaskStatus
  later?: "only" | "exclude"
  person?: string
  tag?: string
  timeRelation?: TaskTimeRelationFilter
  source?: TaskSourceType
}

type TaskRow = RowDataPacket & {
  id: number
  title: string
  status: TaskStatus
  later: boolean
  note: string | null
  first_link: string | null
  first_link_source_type: TaskSourceType | null
  tags_serialized: string | null
  people_serialized: string | null
  timer_started_at: Date | null
  today_tracked_seconds: number | null
  total_tracked_seconds: number | null
  created_at: Date
  updated_at: Date
}

type TaskDetailRow = RowDataPacket & {
  id: number
  title: string
  status: TaskStatus
  later: boolean
  note: string | null
  created_at: Date
  updated_at: Date
}

type TaskLinkRow = RowDataPacket & {
  id: number
  url: string
}

type TaskTagRow = RowDataPacket & {
  id: number
  tag: string
}

type TaskPersonRow = RowDataPacket & {
  id: number
  person_reference: string
}

type TaskTimeSessionRow = RowDataPacket & {
  id: number
  started_at: Date
  ended_at: Date | null
  duration_seconds: number | null
}

type RecentlyOpenedTaskRow = RowDataPacket & {
  id: number
  title: string
  status: TaskStatus
  later: boolean
  last_opened_at: Date
}

export type Task = {
  id: number
  title: string
  status: TaskStatus
  later: boolean
  note: string | null
  firstLink: string | null
  firstLinkSourceType: TaskSourceType | null
  tags: string[]
  people: string[]
  timerStartedAt: Date | null
  todayTrackedSeconds: number
  totalTrackedSeconds: number
  createdAt: Date
  updatedAt: Date
}

export type TaskTimeSession = {
  id: number
  startedAt: Date
  endedAt: Date | null
  durationSeconds: number | null
}

export type TaskDetail = {
  id: number
  title: string
  status: TaskStatus
  later: boolean
  note: string | null
  links: string[]
  tags: string[]
  people: string[]
  timeSessions: TaskTimeSession[]
  createdAt: Date
  updatedAt: Date
}

export type RecentlyOpenedTask = {
  id: number
  title: string
  status: TaskStatus
  later: boolean
  openedAt: Date
}

export type CreateTaskInput = {
  title: string
  note?: string
  firstLink?: string
  tags?: string[]
  people?: string[]
  startTrackingNow?: boolean
}

export type UpdateTaskDetailInput = {
  taskId: number
  title: string
  status: TaskStatus
  later: boolean
  note?: string
  links?: string[]
  tags?: string[]
  people?: string[]
  timeSessions?: Array<{
    startedAt: Date
    endedAt: Date | null
    durationSeconds: number | null
  }>
}

function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus)
}

function parseSerializedList(value: string | null) {
  if (!value) {
    return []
  }

  return value
    .split(LIST_SEPARATOR)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeList(values?: string[]) {
  if (!values || values.length === 0) {
    return []
  }

  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function inferSourceTypeFromUrl(url: string | null): TaskSourceType {
  if (!url) {
    return "other"
  }

  try {
    const host = new URL(url).hostname.toLowerCase()

    if (host.includes("atlassian.net") || host.includes("jira")) {
      return "jira"
    }

    if (host.includes("gitlab")) {
      return "gitlab"
    }

    if (host.includes("github")) {
      return "github"
    }

    if (host.includes("confluence")) {
      return "confluence"
    }
  } catch {
    return "other"
  }

  return "other"
}

function mapRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    later: row.later,
    note: row.note,
    firstLink: row.first_link,
    firstLinkSourceType: row.first_link_source_type ?? inferSourceTypeFromUrl(row.first_link),
    tags: parseSerializedList(row.tags_serialized),
    people: parseSerializedList(row.people_serialized),
    timerStartedAt: row.timer_started_at,
    todayTrackedSeconds: Number(row.today_tracked_seconds ?? 0),
    totalTrackedSeconds: Number(row.total_tracked_seconds ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function ensureTaskRecentOpensTable() {
  if (hasEnsuredTaskRecentOpensTable) {
    return
  }

  await getDbPool().execute(`
    CREATE TABLE IF NOT EXISTS task_recent_opens (
      task_id BIGINT UNSIGNED NOT NULL,
      last_opened_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (task_id),
      CONSTRAINT fk_task_recent_opens_task_id
        FOREIGN KEY (task_id)
        REFERENCES tasks(id)
        ON DELETE CASCADE,
      INDEX idx_task_recent_opens_last_opened_at (last_opened_at)
    ) ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci
  `)

  hasEnsuredTaskRecentOpensTable = true
}

export async function recordTaskOpened(taskId: number) {
  await ensureTaskRecentOpensTable()

  await getDbPool().execute(
    `
      INSERT INTO task_recent_opens (
        task_id,
        last_opened_at
      ) VALUES (?, CURRENT_TIMESTAMP(3))
      ON DUPLICATE KEY UPDATE
        last_opened_at = VALUES(last_opened_at)
    `,
    [taskId],
  )
}

export async function listRecentlyOpenedTasks(limit = MAX_RECENTLY_OPENED_TASKS) {
  await ensureTaskRecentOpensTable()

  const boundedLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.floor(limit), 1), 20)
    : MAX_RECENTLY_OPENED_TASKS

  const [rows] = await getDbPool().query<RecentlyOpenedTaskRow[]>(
    `
      SELECT
        t.id,
        t.title,
        t.status,
        t.later,
        tro.last_opened_at
      FROM task_recent_opens tro
      INNER JOIN tasks t
        ON t.id = tro.task_id
      ORDER BY tro.last_opened_at DESC, tro.task_id DESC
      LIMIT ?
    `,
    [boundedLimit],
  )

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    later: row.later,
    openedAt: row.last_opened_at,
  })) satisfies RecentlyOpenedTask[]
}

export async function listTasks(filters: TaskListFilters = {}) {
  const whereClauses: string[] = []
  const params: Array<string | number | boolean | Date | null> = [LIST_SEPARATOR, LIST_SEPARATOR]

  const query = filters.query?.trim()
  if (query) {
    const searchPattern = `%${query}%`
    whereClauses.push(
      `(
        t.title LIKE ?
        OR COALESCE(t.note, '') LIKE ?
        OR EXISTS (
          SELECT 1
          FROM task_tags tt_search
          WHERE tt_search.task_id = t.id
            AND tt_search.tag LIKE ?
        )
        OR EXISTS (
          SELECT 1
          FROM task_person_references tp_search
          WHERE tp_search.task_id = t.id
            AND tp_search.person_reference LIKE ?
        )
        OR EXISTS (
          SELECT 1
          FROM task_links tl_search
          WHERE tl_search.task_id = t.id
            AND tl_search.url LIKE ?
        )
      )`,
    )
    params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern)
  }

  if (filters.status && isTaskStatus(filters.status)) {
    whereClauses.push("t.status = ?")
    params.push(filters.status)
  }

  if (filters.later === "only") {
    whereClauses.push("t.later = TRUE")
  }

  if (filters.later === "exclude") {
    whereClauses.push("t.later = FALSE")
  }

  const person = filters.person?.trim()
  if (person) {
    whereClauses.push(
      `EXISTS (
        SELECT 1
        FROM task_person_references tp_filter
        WHERE tp_filter.task_id = t.id
          AND tp_filter.person_reference = ?
      )`,
    )
    params.push(person)
  }

  const tag = filters.tag?.trim()
  if (tag) {
    whereClauses.push(
      `EXISTS (
        SELECT 1
        FROM task_tags tt_filter
        WHERE tt_filter.task_id = t.id
          AND tt_filter.tag = ?
      )`,
    )
    params.push(tag)
  }

  if (filters.source) {
    whereClauses.push(
      `EXISTS (
        SELECT 1
        FROM task_links tl_filter
        WHERE tl_filter.task_id = t.id
          AND (
            tl_filter.source_type = ?
            OR (
              (tl_filter.source_type IS NULL OR tl_filter.source_type = 'other')
              AND (
                CASE
                  WHEN LOWER(tl_filter.url) LIKE '%atlassian.net%' OR LOWER(tl_filter.url) LIKE '%jira%' THEN 'jira'
                  WHEN LOWER(tl_filter.url) LIKE '%gitlab%' THEN 'gitlab'
                  WHEN LOWER(tl_filter.url) LIKE '%github%' THEN 'github'
                  WHEN LOWER(tl_filter.url) LIKE '%confluence%' THEN 'confluence'
                  ELSE 'other'
                END
              ) = ?
            )
          )
      )`,
    )
    params.push(filters.source, filters.source)
  }

  switch (filters.timeRelation) {
    case "today":
      whereClauses.push(
        `EXISTS (
          SELECT 1
          FROM task_time_sessions ts_today
          WHERE ts_today.task_id = t.id
            AND COALESCE(ts_today.ended_at, CURRENT_TIMESTAMP(3)) > CURRENT_DATE()
            AND ts_today.started_at < CURRENT_TIMESTAMP(3)
        )`,
      )
      break
    case "this_week":
      whereClauses.push(
        `EXISTS (
          SELECT 1
          FROM task_time_sessions ts_week
          WHERE ts_week.task_id = t.id
            AND COALESCE(ts_week.ended_at, CURRENT_TIMESTAMP(3)) >= DATE_SUB(CURRENT_DATE(), INTERVAL WEEKDAY(CURRENT_DATE()) DAY)
            AND ts_week.started_at < DATE_ADD(DATE_SUB(CURRENT_DATE(), INTERVAL WEEKDAY(CURRENT_DATE()) DAY), INTERVAL 7 DAY)
        )`,
      )
      break
    case "no_time":
      whereClauses.push(
        `NOT EXISTS (
          SELECT 1
          FROM task_time_sessions ts_none
          WHERE ts_none.task_id = t.id
        )`,
      )
      break
    case "recently_updated":
      whereClauses.push("t.updated_at >= DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 7 DAY)")
      break
    default:
      break
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : ""
  const [rows] = await getDbPool().query<TaskRow[]>(
    `
      SELECT
        t.id,
        t.title,
        t.status,
        t.later,
        t.note,
        (
          SELECT tl.url
          FROM task_links tl
          WHERE tl.task_id = t.id
          ORDER BY tl.created_at ASC, tl.id ASC
          LIMIT 1
        ) AS first_link,
        (
          SELECT tl.source_type
          FROM task_links tl
          WHERE tl.task_id = t.id
          ORDER BY tl.created_at ASC, tl.id ASC
          LIMIT 1
        ) AS first_link_source_type,
        (
          SELECT GROUP_CONCAT(tt.tag ORDER BY tt.tag SEPARATOR ?)
          FROM task_tags tt
          WHERE tt.task_id = t.id
        ) AS tags_serialized,
        (
          SELECT GROUP_CONCAT(tp.person_reference ORDER BY tp.person_reference SEPARATOR ?)
          FROM task_person_references tp
          WHERE tp.task_id = t.id
        ) AS people_serialized,
        (
          SELECT ts.started_at
          FROM task_time_sessions ts
          WHERE ts.task_id = t.id AND ts.ended_at IS NULL
          ORDER BY ts.started_at DESC, ts.id DESC
          LIMIT 1
        ) AS timer_started_at,
        (
          SELECT COALESCE(
            SUM(
              GREATEST(
                0,
                TIMESTAMPDIFF(
                  SECOND,
                  GREATEST(ts.started_at, CURRENT_DATE()),
                  LEAST(COALESCE(ts.ended_at, CURRENT_TIMESTAMP(3)), CURRENT_TIMESTAMP(3))
                )
              )
            ),
            0
          )
          FROM task_time_sessions ts
          WHERE ts.task_id = t.id
            AND COALESCE(ts.ended_at, CURRENT_TIMESTAMP(3)) > CURRENT_DATE()
            AND ts.started_at < CURRENT_TIMESTAMP(3)
        ) AS today_tracked_seconds,
        (
          SELECT COALESCE(
            SUM(COALESCE(ts.duration_seconds, TIMESTAMPDIFF(SECOND, ts.started_at, COALESCE(ts.ended_at, CURRENT_TIMESTAMP(3))))),
            0
          )
          FROM task_time_sessions ts
          WHERE ts.task_id = t.id
        ) AS total_tracked_seconds,
        t.created_at,
        t.updated_at
      FROM tasks t
      ${whereSql}
      ORDER BY t.updated_at DESC, t.id DESC
    `,
    params,
  )

  return rows.map(mapRow)
}

export async function getTaskDetail(taskId: number) {
  const pool = getDbPool()

  const [[taskRows], [linkRows], [tagRows], [personRows], [timeSessionRows]] = await Promise.all([
    pool.query<TaskDetailRow[]>(
      `
        SELECT
          t.id,
          t.title,
          t.status,
          t.later,
          t.note,
          t.created_at,
          t.updated_at
        FROM tasks t
        WHERE t.id = ?
        LIMIT 1
      `,
      [taskId],
    ),
    pool.query<TaskLinkRow[]>(
      `
        SELECT tl.id, tl.url
        FROM task_links tl
        WHERE tl.task_id = ?
        ORDER BY tl.created_at ASC, tl.id ASC
      `,
      [taskId],
    ),
    pool.query<TaskTagRow[]>(
      `
        SELECT tt.id, tt.tag
        FROM task_tags tt
        WHERE tt.task_id = ?
        ORDER BY tt.tag ASC, tt.id ASC
      `,
      [taskId],
    ),
    pool.query<TaskPersonRow[]>(
      `
        SELECT tp.id, tp.person_reference
        FROM task_person_references tp
        WHERE tp.task_id = ?
        ORDER BY tp.person_reference ASC, tp.id ASC
      `,
      [taskId],
    ),
    pool.query<TaskTimeSessionRow[]>(
      `
        SELECT
          ts.id,
          ts.started_at,
          ts.ended_at,
          ts.duration_seconds
        FROM task_time_sessions ts
        WHERE ts.task_id = ?
        ORDER BY ts.started_at DESC, ts.id DESC
      `,
      [taskId],
    ),
  ])

  const task = taskRows[0]
  if (!task) {
    return null
  }

  return {
    id: task.id,
    title: task.title,
    status: task.status,
    later: task.later,
    note: task.note,
    links: linkRows.map((row) => row.url),
    tags: tagRows.map((row) => row.tag),
    people: personRows.map((row) => row.person_reference),
    timeSessions: timeSessionRows.map((row) => ({
      id: row.id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      durationSeconds: row.duration_seconds,
    })),
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  } satisfies TaskDetail
}

export async function createTask(input: CreateTaskInput) {
  const title = input.title.trim()
  if (!title) {
    throw new Error("Task title is required")
  }

  const note = input.note?.trim() || null
  const firstLink = input.firstLink?.trim() || null
  const tags = normalizeList(input.tags)
  const people = normalizeList(input.people)

  const pool = getDbPool()
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const [taskInsert] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO tasks (
          title,
          note
        ) VALUES (?, ?)
      `,
      [title, note],
    )

    const taskId = taskInsert.insertId

    if (firstLink) {
      await connection.execute(
        `
          INSERT INTO task_links (
            task_id,
            url,
            source_type
          ) VALUES (?, ?, ?)
        `,
        [taskId, firstLink, inferSourceTypeFromUrl(firstLink)],
      )
    }

    for (const tag of tags) {
      await connection.execute(
        `
          INSERT INTO task_tags (
            task_id,
            tag
          ) VALUES (?, ?)
          ON DUPLICATE KEY UPDATE tag = VALUES(tag)
        `,
        [taskId, tag],
      )
    }

    for (const personReference of people) {
      await connection.execute(
        `
          INSERT INTO task_person_references (
            task_id,
            person_reference
          ) VALUES (?, ?)
          ON DUPLICATE KEY UPDATE person_reference = VALUES(person_reference)
        `,
        [taskId, personReference],
      )
    }

    if (input.startTrackingNow) {
      await connection.execute(
        `
          INSERT INTO task_time_sessions (
            task_id,
            started_at
          ) VALUES (?, CURRENT_TIMESTAMP(3))
        `,
        [taskId],
      )
    }

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function updateTaskDetail(input: UpdateTaskDetailInput) {
  const title = input.title.trim()
  if (!title) {
    throw new Error("Task title is required")
  }

  if (!isTaskStatus(input.status)) {
    throw new Error("Invalid task status")
  }

  const note = input.note?.trim() || null
  const links = normalizeList(input.links)
  const tags = normalizeList(input.tags)
  const people = normalizeList(input.people)
  const timeSessions = input.timeSessions ?? []

  const pool = getDbPool()
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const [updateResult] = await connection.execute<ResultSetHeader>(
      `
        UPDATE tasks
        SET
          title = ?,
          status = ?,
          later = ?,
          note = ?,
          updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?
      `,
      [title, input.status, input.later, note, input.taskId],
    )

    if (updateResult.affectedRows === 0) {
      throw new Error("Task not found")
    }

    await connection.execute(
      `
        DELETE FROM task_links
        WHERE task_id = ?
      `,
      [input.taskId],
    )

    for (const link of links) {
      await connection.execute(
        `
          INSERT INTO task_links (
            task_id,
            url,
            source_type
          ) VALUES (?, ?, ?)
        `,
        [input.taskId, link, inferSourceTypeFromUrl(link)],
      )
    }

    await connection.execute(
      `
        DELETE FROM task_tags
        WHERE task_id = ?
      `,
      [input.taskId],
    )

    for (const tag of tags) {
      await connection.execute(
        `
          INSERT INTO task_tags (
            task_id,
            tag
          ) VALUES (?, ?)
        `,
        [input.taskId, tag],
      )
    }

    await connection.execute(
      `
        DELETE FROM task_person_references
        WHERE task_id = ?
      `,
      [input.taskId],
    )

    for (const personReference of people) {
      await connection.execute(
        `
          INSERT INTO task_person_references (
            task_id,
            person_reference
          ) VALUES (?, ?)
        `,
        [input.taskId, personReference],
      )
    }

    await connection.execute(
      `
        DELETE FROM task_time_sessions
        WHERE task_id = ?
      `,
      [input.taskId],
    )

    for (const session of timeSessions) {
      if (session.endedAt && session.endedAt.getTime() < session.startedAt.getTime()) {
        throw new Error("Invalid time session: endedAt must be after startedAt")
      }

      const durationSeconds = session.endedAt
        ? Math.max(0, Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000))
        : null

      await connection.execute(
        `
          INSERT INTO task_time_sessions (
            task_id,
            started_at,
            ended_at,
            duration_seconds
          ) VALUES (?, ?, ?, ?)
        `,
        [input.taskId, session.startedAt, session.endedAt, durationSeconds],
      )
    }

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
