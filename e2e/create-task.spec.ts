import { expect, test } from '@playwright/test'

async function openQuickAdd(page: import('@playwright/test').Page) {
  await page.getByRole('link', { name: 'Create task' }).click()
  const quickAdd = page.getByRole('dialog', { name: 'Quick add' })
  await expect(quickAdd).toBeVisible()
  await expect(quickAdd.getByLabel('Title *')).toBeEditable()
}

async function submitQuickAdd(page: import('@playwright/test').Page) {
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Create task' }).click(),
  ])
  await expect(page.getByRole('dialog', { name: 'Quick add' })).toHaveCount(0)
}

async function showOnlyTask(page: import('@playwright/test').Page, title: string) {
  await page.goto(`/?q=${encodeURIComponent(title)}`, { waitUntil: 'domcontentloaded' })
}

async function openTaskDetail(page: import('@playwright/test').Page, title: string) {
  await page.getByTestId('main-task-list').getByRole('link', { name: title }).click()
  await expect(page.getByRole('dialog', { name: 'Task detail' })).toBeVisible()
  await expect(page.locator('#detailTitle')).toHaveValue(title)
}

test('create task with title only persists and renders in list', async ({ page }) => {
  const unique = Date.now().toString()
  const title = `Issue2 Title Only ${unique}`

  await page.goto('http://localhost:3000/')
  await showOnlyTask(page, title)

  await openQuickAdd(page)
  await page.getByLabel('Title *').fill(title)
  await submitQuickAdd(page)

  await showOnlyTask(page, title)
  const card = page.getByTestId('main-task-list').locator('li', { hasText: title })
  await expect(card).toBeVisible()
  await expect(card).toContainText('open')
  await expect(card).not.toContainText('Running now')

  await showOnlyTask(page, title)

  const persistedCard = page.getByTestId('main-task-list').locator('li', { hasText: title })
  await expect(persistedCard).toBeVisible()
  await expect(persistedCard).toContainText('open')
})

test('create task with optional fields and tracking persists after reload', async ({ page }) => {
  const unique = Date.now().toString()
  const title = `Issue2 Populated ${unique}`

  await page.goto('http://localhost:3000/')
  await showOnlyTask(page, title)

  await openQuickAdd(page)
  await page.getByLabel('Title *').fill(title)
  await page.getByLabel('Note (optional)').fill('note for issue #2')
  await page.getByLabel('First link (optional)').fill('https://github.com/vercel/next.js')
  await page.getByLabel('First tags (optional)').fill('bug, review')
  await page.getByLabel('First person references (optional)').fill('@anna, @max')
  await page.getByText('Start time tracking now').click()

  await submitQuickAdd(page)

  await showOnlyTask(page, title)
  const card = page.getByTestId('main-task-list').locator('li', { hasText: title })
  await expect(card).toBeVisible()
  await expect(card).toContainText('open')
  await expect(card).toContainText('Running now')
  await expect(card).toContainText('#bug')
  await expect(card).toContainText('#review')
  await expect(card).toContainText('@anna')
  await expect(card).toContainText('@max')

  await showOnlyTask(page, title)

  const persistedCard = page.getByTestId('main-task-list').locator('li', { hasText: title })
  await expect(persistedCard).toBeVisible()
  await expect(persistedCard).toContainText('note for issue #2')
  await expect(persistedCard).toContainText('GitHub')
})

test('open task detail, edit task, and persist detail changes after reload', async ({ page }) => {
  const unique = Date.now().toString()
  const initialTitle = `Issue13 Task ${unique}`
  const updatedTitle = `${initialTitle} Updated`

  await page.goto('/')
  await showOnlyTask(page, initialTitle)

  await openQuickAdd(page)
  await page.getByLabel('Title *').fill(initialTitle)
  await submitQuickAdd(page)

  await showOnlyTask(page, initialTitle)
  await openTaskDetail(page, initialTitle)

  await page.locator('#detailTitle').fill(updatedTitle)
  const statusTrigger = page.locator("#detailStatus")
  await statusTrigger.click()
  await page.getByRole("option", { name: "blocked" }).click()
  await page
    .locator('#detailNote')
    .fill('## Updated detail note\n\nSaved **from preview**.')
  await page.getByRole('tab', { name: 'Preview' }).click()
  await expect(page.getByRole('heading', { name: 'Updated detail note' })).toBeVisible()
  await expect(page.getByText('Saved from preview.')).toBeVisible()

  await Promise.all([
    page.waitForResponse((response) => response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Save detail' }).click(),
  ])

  await expect(page.locator('#detailTitle')).toHaveValue(updatedTitle)
  await page.getByRole('link', { name: 'Close' }).click()
  await showOnlyTask(page, updatedTitle)

  const updatedCard = page.getByTestId('main-task-list').locator('li', { hasText: updatedTitle })
  await expect(updatedCard).toBeVisible()
  await expect(updatedCard).toContainText('blocked')
  await expect(updatedCard).toContainText('Updated detail note')

  await showOnlyTask(page, updatedTitle)
  await openTaskDetail(page, updatedTitle)

  await expect(page.locator('#detailTitle')).toHaveValue(updatedTitle)
  await expect(page.locator("#detailStatus")).toContainText("blocked")
  await expect(page.locator('#detailNote')).toHaveValue(
    '## Updated detail note\n\nSaved **from preview**.'
  )
})

test('closing task detail dialog removes taskId from the URL', async ({ page }) => {
  const unique = Date.now().toString()
  const title = `Issue50 Close Detail ${unique}`

  await page.goto('/')
  await showOnlyTask(page, title)

  await openQuickAdd(page)
  await page.getByLabel('Title *').fill(title)
  await submitQuickAdd(page)

  await showOnlyTask(page, title)
  await openTaskDetail(page, title)
  await expect(page).toHaveURL(/taskId=/)
  await expect(page.getByRole('dialog', { name: 'Task detail' })).toBeVisible()

  await Promise.all([
    page.waitForURL((url) => !url.searchParams.has('taskId'), {
      waitUntil: 'domcontentloaded',
    }),
    page.getByRole('button', { name: 'Close' }).click(),
  ])

  await expect(page.getByRole('dialog', { name: 'Task detail' })).toHaveCount(0)
  await expect(page).not.toHaveURL(/taskId=/)
})

