import { expect, test } from '@playwright/test'
import mysql from 'mysql2/promise'

async function withDbConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST ?? process.env.MYSQL_HOST ?? '127.0.0.1',
    port: Number.parseInt(process.env.DB_PORT ?? process.env.MYSQL_PORT ?? '3306', 10),
    user: process.env.DB_USER ?? process.env.MYSQL_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? process.env.MYSQL_PASSWORD ?? 'localtaskhub',
    database: process.env.DB_NAME ?? process.env.MYSQL_DATABASE ?? 'local-task-hub'
  })
}

test('recently opened area tracks recency, deduplicates, bounds to five, and persists across reload', async ({ page }) => {
  test.setTimeout(120000)
  const unique = Date.now().toString()
  const titles = Array.from({ length: 6 }, (_, index) => 'Issue36 Recent ' + unique + ' ' + String(index + 1))

  const connection = await withDbConnection()
  const taskIds: number[] = []

  try {
    for (const title of titles) {
      const [insertResult] = await connection.execute<mysql.ResultSetHeader>(
        'INSERT INTO tasks (title) VALUES (?)',
        [title]
      )
      taskIds.push(insertResult.insertId)
    }
  } finally {
    await connection.end()
  }

  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const recentArea = page.locator("[aria-label='Recently opened tasks']")
  await expect(recentArea).toBeVisible()

  for (let index = 0; index < taskIds.length; index += 1) {
    await page.goto('/?taskId=' + String(taskIds[index]) + '#task-detail', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('#detailTitle')).toHaveValue(titles[index])
    await page.waitForTimeout(20)
  }

  const recentItems = recentArea.locator('li')
  await expect(recentItems).toHaveCount(5)
  await expect(recentItems.nth(0)).toContainText(titles[5])
  await expect(recentArea.getByRole('link', { name: titles[4] })).toHaveCount(1)
  await expect(recentArea.getByRole('link', { name: titles[3] })).toHaveCount(1)
  await expect(recentArea.getByRole('link', { name: titles[2] })).toHaveCount(1)
  await expect(recentArea.getByRole('link', { name: titles[1] })).toHaveCount(1)
  await expect(recentArea.getByRole('link', { name: titles[0] })).toHaveCount(0)

  await page.goto('/?taskId=' + String(taskIds[2]) + '#task-detail', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#detailTitle')).toHaveValue(titles[2])

  await expect(recentItems).toHaveCount(5)
  await expect(recentItems.nth(0)).toContainText(titles[2])
  await expect(recentArea.getByRole('link', { name: titles[2] })).toHaveCount(1)

  await page.reload()

  await expect(recentArea).toBeVisible()
  await expect(recentItems).toHaveCount(5)
  await expect(recentItems.nth(0)).toContainText(titles[2])
  await expect(recentArea.getByRole('link', { name: titles[2] })).toHaveCount(1)
})
