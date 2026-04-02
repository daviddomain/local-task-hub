import { expect, test } from '@playwright/test'

test('task detail renders attached links as clickable items and keeps one-per-line persistence', async ({ page }) => {
  const unique = Date.now().toString()
  const title = `Issue34 Links ${unique}`

  await page.goto('/')

  const quickAdd = page.locator('#quick-add')
  await quickAdd.scrollIntoViewIfNeeded()
  await quickAdd.getByLabel('Title *').fill(title)
  await quickAdd.getByLabel('Title *').press('Enter')

  await page.getByRole('link', { name: title }).click()

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
  await page.getByRole('link', { name: title }).click()

  await expect(page.locator('#detailLinks')).toHaveValue(
    'https://github.com/vercel/next.js\nhttps://gitlab.com/gitlab-org/gitlab',
  )
  await expect(page.getByLabel('Attached links')).toBeVisible()
})
