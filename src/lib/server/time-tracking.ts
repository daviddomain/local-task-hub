import "server-only"

import type { RowDataPacket } from "mysql2/promise"

import { getDbPool } from "@/lib/server/db"

export async function startTaskTimeTracking(taskId: number) {
  const pool = getDbPool()
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const [taskRows] = await connection.query<RowDataPacket[]>(
      `
        SELECT t.id
        FROM tasks t
        WHERE t.id = ?
        LIMIT 1
      `,
      [taskId],
    )

    if (!taskRows[0]) {
      throw new Error("Task not found")
    }

    const [runningSessionRows] = await connection.query<RowDataPacket[]>(
      `
        SELECT ts.id
        FROM task_time_sessions ts
        WHERE ts.task_id = ?
          AND ts.ended_at IS NULL
        LIMIT 1
      `,
      [taskId],
    )

    if (!runningSessionRows[0]) {
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

    await connection.execute(
      `
        UPDATE tasks
        SET updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?
      `,
      [taskId],
    )

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function stopTaskTimeTracking(taskId: number) {
  const pool = getDbPool()
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const [runningSessionRows] = await connection.query<RowDataPacket[]>(
      `
        SELECT ts.id
        FROM task_time_sessions ts
        WHERE ts.task_id = ?
          AND ts.ended_at IS NULL
        ORDER BY ts.started_at DESC, ts.id DESC
        LIMIT 1
      `,
      [taskId],
    )

    const runningSession = runningSessionRows[0]

    if (runningSession) {
      await connection.execute(
        `
          UPDATE task_time_sessions
          SET
            ended_at = CURRENT_TIMESTAMP(3),
            duration_seconds = TIMESTAMPDIFF(SECOND, started_at, CURRENT_TIMESTAMP(3))
          WHERE id = ?
        `,
        [runningSession.id],
      )

      await connection.execute(
        `
          UPDATE tasks
          SET updated_at = CURRENT_TIMESTAMP(3)
          WHERE id = ?
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

export async function getTodayTotalTrackedSeconds() {
  const [rows] = await getDbPool().query<Array<RowDataPacket & { total_seconds: number | null }>>(
    `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN ts.started_at >= CURRENT_DATE()
                THEN COALESCE(
                  ts.duration_seconds,
                  TIMESTAMPDIFF(SECOND, ts.started_at, COALESCE(ts.ended_at, CURRENT_TIMESTAMP(3)))
                )
              ELSE 0
            END
          ),
          0
        ) AS total_seconds
      FROM task_time_sessions ts
    `,
  )

  return Number(rows[0]?.total_seconds ?? 0)
}
