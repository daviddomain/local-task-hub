import { expect, test } from '@playwright/test'

test('live search and combinable filters work with persisted task data', async ({ page }) => {
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
  await page.getByLabel('First link (optional)').fill(`https://github.com/vercel/next.js/issues/${urlToken}`)
  await page.getByLabel('First tags (optional)').fill(tagToken)
  await page.getByLabel('First person references (optional)').fill(personToken)
  await page.getByRole('button', { name: 'Create task' }).click()

  await page.getByLabel('Title *').fill(otherTitle)
  await page.getByLabel('Note (optional)').fill(`other-${unique}`)
  await page.getByLabel('First link (optional)').fill(`https://example.com/${unique}`)
  await page.getByLabel('First tags (optional)').fill(otherTagToken)
  await page.getByLabel('First person references (optional)').fill(`@other-${unique}`)
  await page.getByRole('button', { name: 'Create task' }).click()

  const targetCard = page.locator('li', { hasText: targetTitle })
  const otherCard = page.locator('li', { hasText: otherTitle })
  await expect(targetCard).toBeVisible()
  await expect(otherCard).toBeVisible()

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
  await page.getByRole('link', { name: targetTitle }).click()
  await page.locator('#detailStatus').selectOption('blocked')
  await page.getByRole('checkbox', { name: 'Later' }).click()
  await page.getByRole('button', { name: 'Save detail' }).click()

  await page.locator('#status').selectOption('blocked')
  await page.locator('#later').selectOption('only')
  await page.locator('#person').selectOption(personToken)
  await page.locator('#tag').selectOption(tagToken)
  await page.locator('#time').selectOption('no_time')
  await page.locator('#source').selectOption('github')
  await page.getByRole('button', { name: 'Apply filters' }).click()

  await expect(page.locator('li', { hasText: targetTitle })).toBeVisible()
  await expect(page.locator('li', { hasText: otherTitle })).toHaveCount(0)

  await page.reload()

  await expect(page.locator('li', { hasText: targetTitle })).toBeVisible()
  await expect(page.locator('li', { hasText: otherTitle })).toHaveCount(0)
})
