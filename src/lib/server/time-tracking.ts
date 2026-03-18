import "server-only"

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise"

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
        FOR UPDATE
      `,
      [taskId],
    )

    if (!taskRows[0]) {
      throw new Error("Task not found")
    }

    const [insertResult] = await connection.execute<ResultSetHeader>(
      `
        INSERT INTO task_time_sessions (
          task_id,
          started_at
        )
        SELECT ?, CURRENT_TIMESTAMP(3)
        FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1
          FROM task_time_sessions ts
          WHERE ts.task_id = ?
            AND ts.ended_at IS NULL
          FOR UPDATE
        )
      `,
      [taskId, taskId],
    )

    if (insertResult.affectedRows > 0) {
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
        FOR UPDATE
      `,
      [taskId],
    )

    const runningSession = runningSessionRows[0]

    if (runningSession) {
      const [stopResult] = await connection.execute<ResultSetHeader>(
        `
          UPDATE task_time_sessions
          SET
            ended_at = CURRENT_TIMESTAMP(3),
            duration_seconds = TIMESTAMPDIFF(SECOND, started_at, CURRENT_TIMESTAMP(3))
          WHERE id = ?
            AND ended_at IS NULL
        `,
        [runningSession.id],
      )

      if (stopResult.affectedRows > 0) {
        await connection.execute(
          `
            UPDATE tasks
            SET updated_at = CURRENT_TIMESTAMP(3)
            WHERE id = ?
          `,
          [taskId],
        )
      }
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
        ) AS total_seconds
      FROM task_time_sessions ts
      WHERE COALESCE(ts.ended_at, CURRENT_TIMESTAMP(3)) > CURRENT_DATE()
        AND ts.started_at < CURRENT_TIMESTAMP(3)
    `,
  )

  return Number(rows[0]?.total_seconds ?? 0)
}
