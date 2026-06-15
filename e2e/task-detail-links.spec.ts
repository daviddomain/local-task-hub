import { expect, test } from '@playwright/test'

async function showOnlyTask(page: import('@playwright/test').Page, title: string) {
  await page.goto(`/?q=${encodeURIComponent(title)}`, { waitUntil: 'domcontentloaded' })
}

async function openTaskDetail(page: import('@playwright/test').Page, title: string) {
  await page.getByTestId('main-task-list').getByRole('link', { name: title }).click()
  await expect(page.getByRole('dialog', { name: 'Task detail' })).toBeVisible()
  await expect(page.locator('#detailTitle')).toHaveValue(title)
}

function formatDisplayDateTimeValue(value: string) {
  const [date, time] = value.split('T')
  const [year, month, day] = date.split('-')

  return `${day}.${month}.${year} ${time}`
}

function withZeroSeconds(value: string) {
  return `${value}:00`
}

async function setTaskDateTimePickerTime(
  page: import('@playwright/test').Page,
  id: string,
  hour: number,
  minute: 0 | 15 | 30 | 45,
) {
  await page.locator(`#${id}`).click()
  const popover = page.locator("[data-slot='popover-content']")
  await expect(popover).toBeVisible()
  await popover.getByRole('button', { name: `Select hour ${String(hour).padStart(2, '0')}` }).click()
  await popover.getByRole('button', { name: `Select minute ${String(minute).padStart(2, '0')}` }).click()
  await page.keyboard.press('Escape')
  await expect(popover).toHaveCount(0)
}

test('task detail renders attached links as clickable items and keeps one-per-line persistence', async ({ page }) => {
  const unique = Date.now().toString()
  const title = `Issue34 Links ${unique}`

  await page.goto('/')
  await showOnlyTask(page, title)

  await page.getByRole('link', { name: 'Create task' }).click()
  await expect(page.getByRole('dialog', { name: 'Quick add' })).toBeVisible()
  const quickAdd = page.locator('#quick-add')
  await quickAdd.getByLabel('Title *').fill(title)
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === 'POST'),
    quickAdd.getByLabel('Title *').press('Enter'),
  ])
  await expect(page.getByRole('dialog', { name: 'Quick add' })).toHaveCount(0)

  await showOnlyTask(page, title)
  await openTaskDetail(page, title)

  await expect(page.getByRole('dialog', { name: 'Task detail' })).toBeVisible()
  await expect(page.getByLabel('Attached links')).toHaveCount(0)

  const linkInput = page.getByLabel('Link URL')
  const addLinkButton = page.getByRole('button', { name: 'Add' })

  await linkInput.fill(' https://github.com/vercel/next.js ')
  await addLinkButton.click()
  await linkInput.fill('https://gitlab.com/gitlab-org/gitlab')
  await linkInput.press('Enter')
  await linkInput.fill('https://localtaskhub.atlassian.net/browse/LTH-38')
  await addLinkButton.click()
  await linkInput.fill('https://example.com/task-38')
  await addLinkButton.click()
  await linkInput.fill('https://github.com/vercel/next.js')
  await addLinkButton.click()

  await expect(page.getByLabel('Attached links').getByRole('link')).toHaveCount(4)
  await expect(page.locator('#detailLinks')).toHaveValue(
    [
      'https://github.com/vercel/next.js',
      'https://gitlab.com/gitlab-org/gitlab',
      'https://localtaskhub.atlassian.net/browse/LTH-38',
      'https://example.com/task-38',
    ].join('\n'),
  )
  await expect(linkInput).toHaveValue('')

  await Promise.all([
    page.waitForResponse((response) => response.request().method() === 'POST'),
    page.locator('#task-detail form').evaluate((form) => {
      (form as HTMLFormElement).requestSubmit()
    }),
  ])

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
  await expect(githubLink).toHaveAttribute('rel', 'noreferrer noopener')
  await expect(gitlabLink).toHaveAttribute('href', 'https://gitlab.com/gitlab-org/gitlab')
  await expect(attachedLinks).toContainText('github.com')
  await expect(attachedLinks).toContainText('gitlab.com')

  const popupPromise = page.waitForEvent('popup')
  await githubLink.click()
  const popup = await popupPromise
  await expect(popup).toHaveURL('https://github.com/vercel/next.js')
  await popup.close()

  await showOnlyTask(page, title)
  const taskCard = page.getByTestId('main-task-list').locator('li', { hasText: title })
  await expect(taskCard).toContainText('GitHub')
  await expect(taskCard).toContainText('GitLab')
  await expect(taskCard).toContainText('Jira')
  await expect(taskCard).toContainText('+1')

  await showOnlyTask(page, title)
  await openTaskDetail(page, title)

  await expect(page.locator('#detailLinks')).toHaveValue(
    [
      'https://github.com/vercel/next.js',
      'https://gitlab.com/gitlab-org/gitlab',
      'https://localtaskhub.atlassian.net/browse/LTH-38',
      'https://example.com/task-38',
    ].join('\n'),
  )
  await expect(page.getByLabel('Attached links')).toBeVisible()
})

test('task detail removes attached links locally and persists the remaining links on save', async ({ page }) => {
  const unique = Date.now().toString()
  const title = `Issue80 Remove Links ${unique}`
  const githubUrl = `https://github.com/daviddomain/local-task-hub/issues/${unique}`
  const gitlabUrl = `https://gitlab.com/local-task-hub/remove-${unique}`
  const docsUrl = `https://example.com/docs/${unique}`
  const pendingUrl = `https://example.com/pending-${unique}`

  await page.goto('/')
  await showOnlyTask(page, title)

  await page.getByRole('link', { name: 'Create task' }).click()
  await expect(page.getByRole('dialog', { name: 'Quick add' })).toBeVisible()
  await page.getByLabel('Title *').fill(title)
  await page.getByLabel('First link (optional)').fill(githubUrl)
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Create task' }).click(),
  ])
  await expect(page.getByRole('dialog', { name: 'Quick add' })).toHaveCount(0)

  await showOnlyTask(page, title)
  await openTaskDetail(page, title)

  const linkInput = page.getByLabel('Link URL')
  const addLinkButton = page.getByRole('button', { name: 'Add' })

  await linkInput.fill(gitlabUrl)
  await addLinkButton.click()
  await linkInput.fill(docsUrl)
  await addLinkButton.click()
  await linkInput.fill(pendingUrl)

  const attachedLinks = page.getByLabel('Attached links')
  await expect(attachedLinks.getByRole('link')).toHaveCount(3)
  await expect(page.locator('#detailLinks')).toHaveValue([githubUrl, gitlabUrl, docsUrl].join('\n'))

  await page.getByRole('button', { name: `Remove link ${gitlabUrl}` }).click()

  await expect(attachedLinks.getByRole('link', { name: gitlabUrl })).toHaveCount(0)
  await expect(attachedLinks.getByRole('link')).toHaveCount(2)
  await expect(page.locator('#detailLinks')).toHaveValue([githubUrl, docsUrl].join('\n'))
  await expect(linkInput).toHaveValue(pendingUrl)

  await Promise.all([
    page.waitForResponse((response) => response.request().method() === 'POST'),
    page.locator('#task-detail form').evaluate((form) => {
      (form as HTMLFormElement).requestSubmit()
    }),
  ])

  await showOnlyTask(page, title)
  await openTaskDetail(page, title)

  const reopenedLinks = page.getByLabel('Attached links')
  await expect(reopenedLinks.getByRole('link', { name: githubUrl })).toBeVisible()
  await expect(reopenedLinks.getByRole('link', { name: docsUrl })).toBeVisible()
  await expect(reopenedLinks.getByRole('link', { name: gitlabUrl })).toHaveCount(0)
  await expect(page.locator('#detailLinks')).toHaveValue([githubUrl, docsUrl].join('\n'))
})

test('task detail supports structured time session editing and explicit removal', async ({ page }) => {
  const unique = Date.now().toString()
  const title = `Issue35 Sessions ${unique}`

  await page.goto('/')
  await showOnlyTask(page, title)

  await page.getByRole('link', { name: 'Create task' }).click()
  await expect(page.getByRole('dialog', { name: 'Quick add' })).toBeVisible()
  await page.getByLabel('Title *').fill(title)
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === 'POST'),
    page.getByRole('button', { name: 'Create task' }).click(),
  ])
  await expect(page.getByRole('dialog', { name: 'Quick add' })).toHaveCount(0)

  await showOnlyTask(page, title)
  const card = page.getByTestId('main-task-list').locator('li', { hasText: title })
  await expect(card).toBeVisible()

  await Promise.all([
    page.waitForResponse((response) => response.request().method() === 'POST'),
    card.getByRole('button', { name: 'Start tracking' }).click(),
  ])
  await page.waitForTimeout(1100)
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === 'POST'),
    card.getByRole('button', { name: 'Stop tracking' }).click(),
  ])

  await showOnlyTask(page, title)
  await openTaskDetail(page, title)

  await expect(page.locator("#task-detail [data-testid='time-session-row']")).toHaveCount(1)

  const startedAtRaw = await page.getByTestId('detailTimeSessionStartedAt-0-value').inputValue()
  const sessionDate = new Date(startedAtRaw)
  sessionDate.setHours(3, 0, 0, 0)
  const startedAt = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(
    sessionDate.getDate(),
  ).padStart(2, '0')}T03:00`
  const endedAt = `${startedAt.slice(0, 11)}04:00`

  await setTaskDateTimePickerTime(page, 'detailTimeSessionStartedAt-0', 3, 0)
  await setTaskDateTimePickerTime(page, 'detailTimeSessionEndedAt-0', 4, 0)
  await expect(page.getByTestId('detailTimeSessionStartedAt-0-value')).toHaveValue(startedAt)
  await expect(page.getByTestId('detailTimeSessionEndedAt-0-value')).toHaveValue(endedAt)

  await Promise.all([
    page.waitForResponse((response) => response.request().method() === 'POST'),
    page.locator('#task-detail form').evaluate((form) => {
      (form as HTMLFormElement).requestSubmit()
    }),
  ])

  await showOnlyTask(page, title)
  await openTaskDetail(page, title)

  await expect(page.getByTestId('detailTimeSessionStartedAt-0-value')).toHaveValue(withZeroSeconds(startedAt))
  await expect(page.getByTestId('detailTimeSessionEndedAt-0-value')).toHaveValue(withZeroSeconds(endedAt))
  await expect(page.locator('#detailTimeSessionStartedAt-0')).toHaveValue(formatDisplayDateTimeValue(startedAt))
  await expect(page.locator('#detailTimeSessionEndedAt-0')).toHaveValue(formatDisplayDateTimeValue(endedAt))
  await expect(page.getByTestId('time-session-duration')).toHaveText('1h 0m')

  await page.locator('#detailTimeSessionRemove-0').check()

  await Promise.all([
    page.waitForResponse((response) => response.request().method() === 'POST'),
    page.locator('#task-detail form').evaluate((form) => {
      (form as HTMLFormElement).requestSubmit()
    }),
  ])

  await showOnlyTask(page, title)
  await openTaskDetail(page, title)

  await expect(page.locator("#task-detail [data-testid='time-session-row']")).toHaveCount(0)
  await expect(page.getByText('No time sessions yet.')).toBeVisible()
})
