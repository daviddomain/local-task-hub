import { expect, test } from '@playwright/test'

test('task detail renders attached links as clickable items and keeps one-per-line persistence', async ({ page }) => {
  const unique = Date.now().toString()
  const title = `Issue34 Links ${unique}`

  await page.goto('/')

  const quickAdd = page.locator('#quick-add')
  await quickAdd.scrollIntoViewIfNeeded()
  await quickAdd.getByLabel('Title *').fill(title)
  await quickAdd.getByLabel('Title *').press('Enter')

  await page.getByTestId('main-task-list').getByRole('link', { name: title }).click()

  await expect(page.getByText('Task detail').first()).toBeVisible()
  await expect(page.getByLabel('Attached links')).toHaveCount(0)

  await page
    .locator('#detailLinks')
    .fill('https://github.com/vercel/next.js\nhttps://gitlab.com/gitlab-org/gitlab')

  await page.locator('#task-detail form').evaluate((form) => {
    (form as HTMLFormElement).requestSubmit()
  })

  const attachedLinks = page.getByLabel('Attached links')
  const githubLink = attachedLinks.getByRole('link', {
    name: 'https://github.com/vercel/next.js',
  })
  const gitlabLink = attachedLinks.getByRole('link', {
    name: 'https://gitlab.com/gitlab-org/gitlab',
  })

  await expect(attachedLinks).toBeVisible()
  await expect(githubLink).toHaveAttribute('href', 'https://github.com/vercel/next.js')
  await expect(githubLink).toHaveAttribute('target', '_blank')
  await expect(gitlabLink).toHaveAttribute('href', 'https://gitlab.com/gitlab-org/gitlab')
  await expect(attachedLinks).toContainText('github.com')
  await expect(attachedLinks).toContainText('gitlab.com')

  const popupPromise = page.waitForEvent('popup')
  await githubLink.click()
  const popup = await popupPromise
  await expect(popup).toHaveURL('https://github.com/vercel/next.js')
  await popup.close()

  await page.reload()
  await page.getByTestId('main-task-list').getByRole('link', { name: title }).click()

  await expect(page.locator('#detailLinks')).toHaveValue(
    'https://github.com/vercel/next.js\nhttps://gitlab.com/gitlab-org/gitlab',
  )
  await expect(page.getByLabel('Attached links')).toBeVisible()
})

test('task detail supports structured time session editing and explicit removal', async ({ page }) => {
  const unique = Date.now().toString()
  const title = `Issue35 Sessions ${unique}`

  await page.goto('/')

  await page.getByLabel('Title *').fill(title)
  await page.getByRole('button', { name: 'Create task' }).click()

  const card = page.getByTestId('main-task-list').locator('li', { hasText: title })
  await expect(card).toBeVisible()

  await card.getByRole('button', { name: 'Start tracking' }).click()
  await page.waitForTimeout(1100)
  await card.getByRole('button', { name: 'Stop tracking' }).click()

  await page.getByTestId('main-task-list').getByRole('link', { name: title }).click()

  await expect(page.locator("#task-detail [data-testid='time-session-row']")).toHaveCount(1)

  const startedAt = '2026-01-02T03:04:05.000Z'
  const endedAt = '2026-01-02T04:04:05.000Z'

  await page.locator('#detailTimeSessionStartedAt-0').fill(startedAt)
  await page.locator('#detailTimeSessionEndedAt-0').fill(endedAt)
  await page.locator('#detailTimeSessionDuration-0').fill('3600')

  await page.locator('#task-detail form').evaluate((form) => {
    (form as HTMLFormElement).requestSubmit()
  })

  await page.reload()
  await page.getByTestId('main-task-list').getByRole('link', { name: title }).click()

  await expect(page.locator('#detailTimeSessionStartedAt-0')).toHaveValue(startedAt)
  await expect(page.locator('#detailTimeSessionEndedAt-0')).toHaveValue(endedAt)
  await expect(page.locator('#detailTimeSessionDuration-0')).toHaveValue('3600')

  await page.locator('#detailTimeSessionRemove-0').check()

  await page.locator('#task-detail form').evaluate((form) => {
    (form as HTMLFormElement).requestSubmit()
  })

  await page.reload()
  await page.getByTestId('main-task-list').getByRole('link', { name: title }).click()

  await expect(page.locator("#task-detail [data-testid='time-session-row']")).toHaveCount(0)
  await expect(page.getByText('No time sessions yet.')).toBeVisible()
})
