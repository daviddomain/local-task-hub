import { expect, test } from '@playwright/test'

test('create task with title only persists and renders in list', async ({ page }) => {
  const unique = Date.now().toString()
  const title = `Issue2 Title Only ${unique}`

  await page.goto('http://localhost:3000/')

  await page.getByLabel('Title *').fill(title)
  await page.getByRole('button', { name: 'Create task' }).click()

  const card = page.locator('li', { hasText: title })
  await expect(card).toBeVisible()
  await expect(card).toContainText('open')
  await expect(card).not.toContainText('Running now')

  await page.reload()

  const persistedCard = page.locator('li', { hasText: title })
  await expect(persistedCard).toBeVisible()
  await expect(persistedCard).toContainText('open')
})

test('create task with optional fields and tracking persists after reload', async ({ page }) => {
  const unique = Date.now().toString()
  const title = `Issue2 Populated ${unique}`

  await page.goto('http://localhost:3000/')

  await page.getByLabel('Title *').fill(title)
  await page.getByLabel('Note (optional)').fill('note for issue #2')
  await page.getByLabel('First link (optional)').fill('https://github.com/vercel/next.js')
  await page.getByLabel('First tags (optional)').fill('bug, review')
  await page.getByLabel('First person references (optional)').fill('@anna, @max')
  await page.getByText('Start time tracking now').click()

  await page.getByRole('button', { name: 'Create task' }).click()

  const card = page.locator('li', { hasText: title })
  await expect(card).toBeVisible()
  await expect(card).toContainText('open')
  await expect(card).toContainText('Running now')
  await expect(card).toContainText('#bug')
  await expect(card).toContainText('#review')
  await expect(card).toContainText('@anna')
  await expect(card).toContainText('@max')

  await page.reload()

  const persistedCard = page.locator('li', { hasText: title })
  await expect(persistedCard).toBeVisible()
  await expect(persistedCard).toContainText('note for issue #2')
  await expect(persistedCard).toContainText('GitHub')
})

test('open task detail, edit task, and persist detail changes after reload', async ({ page }) => {
  const unique = Date.now().toString()
  const initialTitle = `Issue13 Task ${unique}`
  const updatedTitle = `${initialTitle} Updated`

  await page.goto('/')

  await page.getByLabel('Title *').fill(initialTitle)
  await page.getByRole('button', { name: 'Create task' }).click()

  await page.getByRole('link', { name: initialTitle }).click()

  await expect(page.getByText('Task detail').first()).toBeVisible()
  await expect(page.locator('#detailTitle')).toHaveValue(initialTitle)

  await page.locator('#detailTitle').fill(updatedTitle)
  const statusTrigger = page.locator("#detailStatus")
  await statusTrigger.click()
  await page.getByRole("option", { name: "blocked" }).click()
  await page.locator('#detailNote').fill('Updated detail note')

  await page.getByRole('button', { name: 'Save detail' }).click()

  const updatedCard = page.locator('li', { hasText: updatedTitle })
  await expect(updatedCard).toBeVisible()
  await expect(updatedCard).toContainText('blocked')
  await expect(updatedCard).toContainText('Updated detail note')

  await page.reload()
  await page.getByRole('link', { name: updatedTitle }).click()

  await expect(page.locator('#detailTitle')).toHaveValue(updatedTitle)
  await expect(page.locator("#detailStatus")).toContainText("blocked")
  await expect(page.locator('#detailNote')).toHaveValue('Updated detail note')
})
