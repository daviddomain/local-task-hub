import "server-only"

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise"

import { getDbPool } from "@/lib/server/db"

type TaskStatus = "open" | "in_progress" | "blocked" | "waiting" | "review" | "done"

type TaskRow = RowDataPacket & {
  id: number
  title: string
  status: TaskStatus
  later: boolean
  note: string | null
  first_link: string | null
  tags_serialized: string | null
  people_serialized: string | null
  timer_started_at: Date | null
  created_at: Date
  updated_at: Date
}

export type Task = {
  id: number
  title: string
  status: TaskStatus
  later: boolean
  note: string | null
  firstLink: string | null
  tags: string[]
  people: string[]
  timerStartedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type CreateTaskInput = {
  title: string
  note?: string
  firstLink?: string
  tags?: string[]
  people?: string[]
  startTrackingNow?: boolean
}

const LIST_SEPARATOR = "\u001F"

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

function mapRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    later: row.later,
    note: row.note,
    firstLink: row.first_link,
    tags: parseSerializedList(row.tags_serialized),
    people: parseSerializedList(row.people_serialized),
    timerStartedAt: row.timer_started_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listTasks() {
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
        t.created_at,
        t.updated_at
      FROM tasks t
      ORDER BY t.updated_at DESC, t.id DESC
    `,
    [LIST_SEPARATOR, LIST_SEPARATOR],
  )

  return rows.map(mapRow)
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
            url
          ) VALUES (?, ?)
        `,
        [taskId, firstLink],
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
