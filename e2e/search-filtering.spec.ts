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

test('live search and combinable filters work with persisted data', async ({ page }) => {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const targetTitle = `Issue11 Target ${unique}`
  const otherTitle = `Issue11 Other ${unique}`
  const noteToken = `note-${unique}`
  const tagToken = `tag-alpha-${unique}`
  const otherTagToken = `tag-beta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const personToken = `@person-${unique}`
  const urlToken = `issue11-${unique}`

  await page.goto('/')

  await page.getByLabel('Title *').fill(targetTitle)
  await page.getByLabel('Note (optional)').fill(`Contains ${noteToken}`)
  await page
    .getByLabel('First link (optional)')
    .fill(`https://github.com/vercel/next.js/issues/${urlToken}`)
  await page.getByLabel('First tags (optional)').fill(tagToken)
  await page.getByLabel('First person references (optional)').fill(personToken)
  await page.getByRole('button', { name: 'Create task' }).click()

  const targetCard = page.locator('li', { hasText: targetTitle })
  await expect(targetCard).toBeVisible()

  await page.getByLabel('Title *').fill(otherTitle)
  await page.getByLabel('Note (optional)').fill(`other-${unique}`)
  await page.getByLabel('First link (optional)').fill(`https://example.com/${unique}`)
  await page.getByLabel('First tags (optional)').fill(otherTagToken)
  await page.getByLabel('First person references (optional)').fill(`@other-${unique}`)
  await page.getByRole('button', { name: 'Create task' }).click()

  const otherCard = page.locator('li', { hasText: otherTitle })
  await expect(otherCard).toBeVisible()

  // Simulate legacy persisted data where known-source URL exists but source_type stayed at fallback 'other'.
  const connection = await withDbConnection()
  try {
    const [targetRows] = await connection.query<Array<{ id: number }>>(
      'SELECT id FROM tasks WHERE title = ? ORDER BY id DESC LIMIT 1',
      [targetTitle]
    )
    const targetTaskId = targetRows[0]?.id

    expect(targetTaskId).toBeTruthy()

    await connection.execute("UPDATE task_links SET source_type = 'other' WHERE task_id = ?", [
      targetTaskId
    ])
    await connection.execute('UPDATE tasks SET status = ?, later = ? WHERE id = ?', [
      'blocked',
      true,
      targetTaskId
    ])
  } finally {
    await connection.end()
  }

  await page.reload()

  await expect(targetCard).toBeVisible()

  const searchInput = page.locator('#task-search')
  await searchInput.fill(noteToken)
  await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(noteToken)}`))
  await expect(targetCard).toBeVisible()
  await expect(otherCard).toHaveCount(0)

  await page.goto(`/?q=${encodeURIComponent(tagToken)}`)
  await expect(page.locator('li', { hasText: targetTitle })).toBeVisible()
  await expect(page.locator('li', { hasText: otherTitle })).toHaveCount(0)

  await page.goto(`/?q=${encodeURIComponent(personToken)}`)
  await expect(page.locator('li', { hasText: targetTitle })).toBeVisible()
  await expect(page.locator('li', { hasText: otherTitle })).toHaveCount(0)

  await page.goto(`/?q=${encodeURIComponent(urlToken)}`)
  await expect(page.locator('li', { hasText: targetTitle })).toBeVisible()
  await expect(page.locator('li', { hasText: otherTitle })).toHaveCount(0)

  await page.goto('/')
  await page.locator('#status').selectOption('blocked')
  await page.locator('#later').selectOption('only')
  await page.locator('#person').selectOption(personToken)
  await page.locator('#tag').selectOption(tagToken)
  await page.locator('#time').selectOption('no_time')
  await page.locator('#source').selectOption('github')
  await page.getByRole('button', { name: 'Apply filters' }).click()

  // Regression check: legacy row (source_type='other') still matches GitHub source filter via URL inference.
  await expect(page.locator('li', { hasText: targetTitle })).toBeVisible()
  await expect(page.locator('li', { hasText: otherTitle })).toHaveCount(0)

  await page.reload()

  await expect(page.locator('li', { hasText: targetTitle })).toBeVisible()
  await expect(page.locator('li', { hasText: otherTitle })).toHaveCount(0)
})
