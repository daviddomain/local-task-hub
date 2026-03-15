import { expect, test } from '@playwright/test'

test('create task flow persists and renders in list', async ({ page }) => {
  const unique = Date.now().toString()
  const title = `Issue2 Task ${unique}`

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
  await expect(card).toContainText('running now')
  await expect(card).toContainText('Tags: bug, review')
  await expect(card).toContainText('People: @anna, @max')

  await page.reload()

  const persistedCard = page.locator('li', { hasText: title })
  await expect(persistedCard).toBeVisible()
  await expect(persistedCard).toContainText('note for issue #2')
})
