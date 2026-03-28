import { expect, test } from '@playwright/test'
import mysql from 'mysql2/promise'

function uniqueToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function withDbConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST ?? process.env.MYSQL_HOST ?? '127.0.0.1',
    port: Number.parseInt(process.env.DB_PORT ?? process.env.MYSQL_PORT ?? '3306', 10),
    user: process.env.DB_USER ?? process.env.MYSQL_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? process.env.MYSQL_PASSWORD ?? 'localtaskhub',
    database: process.env.DB_NAME ?? process.env.MYSQL_DATABASE ?? 'local-task-hub'
  })
}

test('exports selected task as markdown and active/open tasks as JSON', async ({ page }) => {
  const unique = uniqueToken()
  const openTitle = `Issue12 Open ${unique}`
  const doneTitle = `Issue12 Done ${unique}`

  await page.goto('/')

  await page.getByLabel('Title *').fill(openTitle)
  await page.getByLabel('Note (optional)').fill(`Note ${unique}`)
  await page.getByLabel('First link (optional)').fill(`https://github.com/vercel/next.js/issues/${unique}`)
  await page.getByLabel('First tags (optional)').fill(`tag-${unique}`)
  await page.getByLabel('First person references (optional)').fill(`@person-${unique}`)
  await page.getByRole('button', { name: 'Create task' }).click()

  await expect(page.locator('li', { hasText: openTitle })).toBeVisible()

  await page.getByLabel('Title *').fill(doneTitle)
  await page.getByRole('button', { name: 'Create task' }).click()
  await expect(page.locator('li', { hasText: doneTitle })).toBeVisible()

  const connection = await withDbConnection()
  try {
    await connection.execute('UPDATE tasks SET status = ? WHERE title = ?', ['done', doneTitle])
  } finally {
    await connection.end()
  }

  await page.reload()
  await expect(page.locator('li', { hasText: doneTitle })).toContainText('done')

  await page.getByRole('link', { name: openTitle }).click()

  const markdownResponse = await page.request.get('/api/exports/task/invalid/markdown')
  expect(markdownResponse.status()).toBe(400)

  const selectedTaskLink = page.getByRole('link', { name: openTitle })
  const selectedTaskHref = await selectedTaskLink.getAttribute('href')
  expect(selectedTaskHref).toBeTruthy()

  const taskIdMatch = selectedTaskHref?.match(/taskId=(\d+)/)
  expect(taskIdMatch).toBeTruthy()
  const taskId = Number.parseInt(taskIdMatch?.[1] ?? '', 10)
  expect(Number.isNaN(taskId)).toBeFalsy()

  const markdownExportResponse = await page.request.get(`/api/exports/task/${taskId}/markdown`)
  expect(markdownExportResponse.status()).toBe(200)
  expect(markdownExportResponse.headers()['content-type']).toContain('text/markdown')

  const markdownContent = await markdownExportResponse.text()
  expect(markdownContent).toContain(`# ${openTitle}`)
  expect(markdownContent).toContain('## Links')
  expect(markdownContent).toContain(`https://github.com/vercel/next.js/issues/${unique}`)
  expect(markdownContent).toContain(`tag-${unique}`)
  expect(markdownContent).toContain(`@person-${unique}`)
  expect(markdownContent).toContain('## Time summary')

  const jsonExportResponse = await page.request.get('/api/exports/tasks/open')
  expect(jsonExportResponse.status()).toBe(200)
  expect(jsonExportResponse.headers()['content-type']).toContain('application/json')

  const payload = (await jsonExportResponse.json()) as {
    scope: string
    tasks: Array<{ title: string; status: string; links: string[]; tags: string[]; people: string[] }>
  }

  expect(payload.scope).toBe('active_open_tasks')
  expect(payload.tasks.some((task) => task.title === openTitle)).toBeTruthy()
  expect(payload.tasks.some((task) => task.title === doneTitle)).toBeFalsy()

  const exportedOpenTask = payload.tasks.find((task) => task.title === openTitle)
  expect(exportedOpenTask).toBeTruthy()
  expect(exportedOpenTask?.status).toBe('open')
  expect(exportedOpenTask?.links).toContain(`https://github.com/vercel/next.js/issues/${unique}`)
  expect(exportedOpenTask?.tags).toContain(`tag-${unique}`)
  expect(exportedOpenTask?.people).toContain(`@person-${unique}`)
})
