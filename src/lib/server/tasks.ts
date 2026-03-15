import "server-only"

import mysql, { type Pool, type RowDataPacket } from "mysql2/promise"

type TaskStatus = "open" | "in_progress" | "blocked" | "waiting" | "review" | "done"

type TaskRow = RowDataPacket & {
  id: number
  title: string
  status: TaskStatus
  later: boolean
  note: string | null
  first_link: string | null
  tags_json: string | string[] | null
  people_json: string | string[] | null
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

declare global {
  var __localTaskHubTaskPool: Pool | undefined
}

function getPool() {
  if (!global.__localTaskHubTaskPool) {
    global.__localTaskHubTaskPool = mysql.createPool({
      host: process.env.DB_HOST ?? "127.0.0.1",
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER ?? "root",
      password: process.env.DB_PASSWORD ?? "localtaskhub",
      database: process.env.DB_NAME ?? "local-task-hub",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    })
  }

  return global.__localTaskHubTaskPool
}

async function ensureTasksTable() {
  await getPool().execute(
    `
      CREATE TABLE IF NOT EXISTS tasks (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        status ENUM('open', 'in_progress', 'blocked', 'waiting', 'review', 'done') NOT NULL DEFAULT 'open',
        later BOOLEAN NOT NULL DEFAULT FALSE,
        note TEXT NULL,
        first_link TEXT NULL,
        tags_json JSON NULL,
        people_json JSON NULL,
        timer_started_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_tasks_updated_at (updated_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  )
}

function parseJsonList(value: string | string[] | null) {
  if (!value) {
    return []
  }

  if (Array.isArray(value)) {
    return value
  }

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []
  } catch {
    return []
  }
}

function mapRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    later: row.later,
    note: row.note,
    firstLink: row.first_link,
    tags: parseJsonList(row.tags_json),
    people: parseJsonList(row.people_json),
    timerStartedAt: row.timer_started_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listTasks() {
  await ensureTasksTable()

  const [rows] = await getPool().query<TaskRow[]>(
    `
      SELECT
        id,
        title,
        status,
        later,
        note,
        first_link,
        tags_json,
        people_json,
        timer_started_at,
        created_at,
        updated_at
      FROM tasks
      ORDER BY updated_at DESC
    `,
  )

  return rows.map(mapRow)
}

export async function createTask(input: CreateTaskInput) {
  await ensureTasksTable()

  const title = input.title.trim()
  if (!title) {
    throw new Error("Task title is required")
  }

  const note = input.note?.trim() || null
  const firstLink = input.firstLink?.trim() || null
  const tags = input.tags?.map((tag) => tag.trim()).filter(Boolean) ?? []
  const people = input.people?.map((person) => person.trim()).filter(Boolean) ?? []

  await getPool().execute(
    `
      INSERT INTO tasks (
        title,
        note,
        first_link,
        tags_json,
        people_json,
        timer_started_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      title,
      note,
      firstLink,
      tags.length > 0 ? JSON.stringify(tags) : null,
      people.length > 0 ? JSON.stringify(people) : null,
      input.startTrackingNow ? new Date() : null,
    ],
  )
}
