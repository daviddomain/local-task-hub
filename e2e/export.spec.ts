import { expect, test } from '@playwright/test'

function uniqueToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

test('exports selected task as markdown and open tasks as JSON via UI triggers', async ({ page }) => {
  const unique = uniqueToken()
  const openTitle = `Issue14 Open ${unique}`
  const doneTitle = `Issue14 Done ${unique}`

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

  await page.getByRole('link', { name: doneTitle }).click()
  await page.getByRole('button', { name: 'Mark done' }).click()
  await expect(page.locator('li', { hasText: doneTitle })).toContainText('done')

  await page.getByRole('link', { name: openTitle }).click()

  const markdownLink = page.getByRole('link', { name: 'Export markdown' })
  const markdownPath = await markdownLink.getAttribute('href')

  expect(markdownPath).toBeTruthy()
  expect(markdownPath).toMatch(/^\/api\/exports\/task\/\d+\/markdown$/)

  const [markdownExportResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/api/exports/task/') &&
        response.url().endsWith('/markdown')
    ),
    markdownLink.click(),
  ])

  expect(markdownExportResponse.status()).toBe(200)
  expect(markdownExportResponse.headers()['content-type']).toContain('text/markdown')

  const markdownContent = await markdownExportResponse.text()
  expect(markdownContent).toContain(`# ${openTitle}`)
  expect(markdownContent).toContain('## Links')
  expect(markdownContent).toContain(`https://github.com/vercel/next.js/issues/${unique}`)
  expect(markdownContent).toContain(`tag-${unique}`)
  expect(markdownContent).toContain(`@person-${unique}`)
  expect(markdownContent).toContain('## Time summary')

  await page.goBack()

  await page.goto('/')

  const openExportLink = page.getByRole('link', { name: 'Export open JSON' })
  const openExportPath = await openExportLink.getAttribute('href')

  expect(openExportPath).toBe('/api/exports/tasks/open')

  const [jsonExportResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' && response.url().endsWith('/api/exports/tasks/open')
    ),
    openExportLink.click(),
  ])

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
