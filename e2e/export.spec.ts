import { expect, test } from '@playwright/test'

function uniqueToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function submitQuickAdd(page: import('@playwright/test').Page) {
  const createButton = page.getByRole('button', { name: 'Create task' })
  await expect(createButton).toBeVisible()
  await createButton.evaluate((element) => {
    ;(element as HTMLButtonElement).click()
  })
}

async function openTaskDetail(page: import('@playwright/test').Page, title: string) {
  const taskCard = page.locator('li', { hasText: title })
  await expect(taskCard).toBeVisible()

  const taskLink = taskCard.getByRole('link', { name: title }).first()
  const taskHref = await taskLink.getAttribute('href')

  expect(taskHref).toBeTruthy()
  expect(taskHref).toContain('taskId=')

  await page.goto(taskHref!)
  await expect(page.locator('#detailTitle')).toHaveValue(title)
}

test('exports selected task as markdown and open tasks as JSON', async ({ page }) => {
  const unique = uniqueToken()
  const openTitle = `Issue12 Open ${unique}`
  const doneTitle = `Issue12 Done ${unique}`

  await page.goto('/')

  await page.getByLabel('Title *').fill(openTitle)
  await page.getByLabel('Note (optional)').fill(`Note ${unique}`)
  await page.getByLabel('First link (optional)').fill(`https://github.com/vercel/next.js/issues/${unique}`)
  await page.getByLabel('First tags (optional)').fill(`tag-${unique}`)
  await page.getByLabel('First person references (optional)').fill(`@person-${unique}`)
  await submitQuickAdd(page)

  await expect(page.locator('li', { hasText: openTitle })).toBeVisible()

  await page.getByLabel('Title *').fill(doneTitle)
  await submitQuickAdd(page)
  await expect(page.locator('li', { hasText: doneTitle })).toBeVisible()

  await openTaskDetail(page, doneTitle)

  const markDoneButton = page.getByRole('button', { name: 'Mark done' })
  await expect(markDoneButton).toBeVisible()
  await markDoneButton.evaluate((element) => {
    ;(element as HTMLButtonElement).click()
  })
  await expect(page.locator('li', { hasText: doneTitle })).toContainText('done')

  await openTaskDetail(page, openTitle)

  const markdownLink = page.getByRole('link', { name: 'Export markdown' })
  await expect(markdownLink).toBeVisible()

  const markdownPath = await markdownLink.getAttribute('href')
  expect(markdownPath).toBeTruthy()
  expect(markdownPath).toMatch(/^\/api\/exports\/task\/\d+\/markdown$/)

  const markdownExportResponse = await page.request.get(markdownPath!)
  expect(markdownExportResponse.status()).toBe(200)
  expect(markdownExportResponse.headers()['content-type']).toContain('text/markdown')

  const markdownContent = await markdownExportResponse.text()
  expect(markdownContent).toContain(`# ${openTitle}`)
  expect(markdownContent).toContain('## Links')
  expect(markdownContent).toContain(`https://github.com/vercel/next.js/issues/${unique}`)
  expect(markdownContent).toContain(`tag-${unique}`)
  expect(markdownContent).toContain(`@person-${unique}`)
  expect(markdownContent).toContain('## Time summary')

  await page.goto('/')

  const openExportLink = page.getByRole('link', { name: 'Export open JSON' })
  await expect(openExportLink).toBeVisible()

  const openExportPath = await openExportLink.getAttribute('href')
  expect(openExportPath).toBe('/api/exports/tasks/open')

  const jsonExportResponse = await page.request.get(openExportPath!)
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
