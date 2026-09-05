import { expect, test, type Page } from '@playwright/test'

async function createTask(page: Page, title: string) {
  await page.getByRole('link', { name: 'Create task', exact: true }).click()
  const quickAdd = page.getByRole('dialog', { name: 'Quick add' })
  await quickAdd.getByLabel('Title *').fill(title)
  await quickAdd.getByRole('button', { name: 'Create task', exact: true }).click()
  await expect(quickAdd).toHaveCount(0)
}

async function openTask(page: Page, title: string) {
  await page.getByTestId('main-task-list').getByRole('link', { name: title, exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Task detail' })).toBeVisible()
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(title)
}

test('save stays mounted, preserves preview, focus, scroll and URL, and supports a second edit', async ({ page }) => {
  const title = `Issue92 stable ${Date.now()}`
  await page.goto('/')
  await createTask(page, title)
  await page.getByRole('searchbox', { name: 'Search Tasks' }).fill(title)
  await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(title).replaceAll('%20', '\\+')}`))
  await openTask(page, title)
  const detail = page.getByRole('dialog', { name: 'Task detail' })
  const url = page.url()
  await detail.getByLabel('Title', { exact: true }).fill(`  ${title} updated  `)
  await detail.getByLabel('Note (markdown text)').fill('## Saved preview\n\n' + 'A paragraph to keep the dialog scrollable.\n\n'.repeat(12))
  await detail.getByRole('tab', { name: 'Preview' }).click()
  const save = detail.getByRole('button', { name: 'Save detail', exact: true })
  await save.scrollIntoViewIfNeeded()

  const continuity = await detail.evaluateHandle((dialog) => {
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')!
    const scroll = dialog.querySelector('form')!.parentElement!
    const observation = { dialog, overlay, scroll, scrollTop: scroll.scrollTop, interrupted: false }
    const observer = new MutationObserver((records) => {
      if (!dialog.isConnected || !overlay.isConnected) observation.interrupted = true
      for (const record of records) {
        if (record.type === 'childList' && [...record.removedNodes].some((node) => node.contains(dialog) || node.contains(overlay))) {
          observation.interrupted = true
        }
        if (record.type === 'attributes' && (record.target === dialog || record.target === overlay)) {
          if ((record.target as Element).getAttribute('data-state') !== 'open') observation.interrupted = true
        }
      }
    })
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-state'] })
    return { observation, observer }
  })

  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  let submissions = 0
  await page.route('**/*', async (route) => {
    if (route.request().method() === 'POST' && route.request().headers()['next-action']) {
      submissions += 1
      await gate
    }
    await route.continue()
  })
  try {
    await save.click()
    await expect(detail.getByRole('status')).toHaveText('Saving…')
    await expect(save).toBeDisabled()
    await expect(detail.getByLabel('Title', { exact: true })).toBeDisabled()
    // Simulate a second submit event while the first request is held at the network boundary.
    await detail.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit())
  } finally {
    release()
  }
  await expect(detail.getByRole('status')).toHaveText('Task details saved.')
  expect(submissions).toBe(1)
  await expect(save).toBeFocused()
  await expect(detail.getByRole('tab', { name: 'Preview' })).toHaveAttribute('aria-selected', 'true')
  await expect(page).toHaveURL(url)
  expect(await continuity.evaluate(({ observation, observer }) => {
    observer.disconnect()
    return {
      interrupted: observation.interrupted,
      sameDialog: observation.dialog === document.querySelector('#task-detail'),
      sameOverlay: observation.overlay.isConnected,
      scrollDelta: Math.abs(observation.scroll.scrollTop - observation.scrollTop)
    }
  })).toEqual({ interrupted: false, sameDialog: true, sameOverlay: true, scrollDelta: 0 })
  await expect(detail.getByLabel('Title', { exact: true })).toHaveValue(`${title} updated`)

  await detail.getByRole('tab', { name: 'Edit', exact: true }).click()
  await detail.getByLabel('Note (markdown text)').fill('Second saved note')
  await expect(detail.getByRole('status')).toBeEmpty()
  await save.click()
  await expect(detail.getByRole('status')).toHaveText('Task details saved.')
  await page.reload()
  await expect(detail.getByLabel('Title', { exact: true })).toHaveValue(`${title} updated`)
  await expect(detail.getByLabel('Note (markdown text)')).toHaveValue('Second saved note')
  await detail.getByRole('link', { name: 'Close', exact: true }).click()
  await expect(detail).toHaveCount(0)
  await expect(page.getByTestId('main-task-list')).toContainText('Second saved note')
})

test('validation, database and transport errors retain inputs and allow retry', async ({ page }) => {
  const title = `Issue92 errors ${Date.now()}`
  await page.goto('/')
  await createTask(page, title)
  await openTask(page, title)
  const detail = page.getByRole('dialog', { name: 'Task detail' })
  const titleInput = detail.getByLabel('Title', { exact: true })
  const save = detail.getByRole('button', { name: 'Save detail', exact: true })
  await titleInput.fill('   ')
  await detail.getByLabel('Tags (comma-separated)').fill('unsaved-tag')
  await detail.getByLabel('Note (markdown text)').fill('Preserve this draft')
  await detail.getByRole('tab', { name: 'Preview' }).click()
  await save.click()
  await expect(detail.getByRole('alert')).toHaveText('Task title is required.')
  await expect(titleInput).toHaveValue('   ')
  await expect(detail.getByLabel('Tags (comma-separated)')).toHaveValue('unsaved-tag')
  await expect(detail.getByRole('tab', { name: 'Preview' })).toHaveAttribute('aria-selected', 'true')

  // The existing MySQL title column has a 255-character limit; exercise rollback and safe feedback.
  await titleInput.fill('x'.repeat(256))
  await save.click()
  await expect(detail.getByRole('alert')).toHaveText('Could not save task details. Your inputs are preserved. Please try again.')
  await expect(titleInput).toHaveValue('x'.repeat(256))
  await expect(page.getByTestId('main-task-list')).toContainText(title)

  await titleInput.fill(title)
  await page.route('**/*', async (route) => {
    if (route.request().method() === 'POST' && route.request().headers()['next-action']) {
      await route.abort('failed')
    } else {
      await route.continue()
    }
  })
  await save.click()
  await expect(detail.getByRole('alert')).toHaveText('Could not confirm the save. Your inputs are preserved. Please try again.')
  await expect(detail.getByLabel('Tags (comma-separated)')).toHaveValue('unsaved-tag')
  await expect(detail.getByText('Preserve this draft', { exact: true })).toBeVisible()
  await page.unrouteAll({ behavior: 'wait' })
  await save.click()
  await expect(detail.getByRole('status')).toHaveText('Task details saved.')
  await expect(detail.getByRole('alert')).toHaveCount(0)
  await page.reload()
  await expect(detail.getByLabel('Note (markdown text)')).toHaveValue('Preserve this draft')
  await expect(detail.getByLabel('Tags (comma-separated)')).toHaveValue('unsaved-tag')
})

test('completion preserves filters and selected task, and history does not leak form state', async ({ page }) => {
  const prefix = `Issue92 navigation ${Date.now()}`
  const first = `${prefix} first`
  const second = `${prefix} second`
  await page.goto('/')
  await createTask(page, first)
  await createTask(page, second)
  await page.getByRole('searchbox', { name: 'Search Tasks' }).fill(prefix)
  await expect(page).toHaveURL(/q=/)
  await page.getByRole('combobox', { name: 'Status', exact: true }).click()
  await page.getByRole('option', { name: 'open', exact: true }).click()
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page).toHaveURL(/status=open/)
  const listUrl = page.url()
  await openTask(page, first)
  const detail = page.getByRole('dialog', { name: 'Task detail' })
  const detailUrl = page.url()
  await detail.getByLabel('Note (markdown text)').fill('Saved by completion')
  await detail.getByRole('button', { name: 'Later', exact: true }).click()
  await detail.getByRole('button', { name: 'Mark done', exact: true }).click()
  await expect(detail.getByRole('status')).toHaveText('Task details saved.')
  await expect(detail.getByRole('button', { name: 'Reopen task' })).toBeVisible()
  await expect(detail.getByRole('combobox', { name: 'Status', exact: true })).toContainText('done')
  await expect(page).toHaveURL(detailUrl)
  await expect(page.getByTestId('main-task-list').getByRole('link', { name: first, exact: true })).toHaveCount(0)
  await detail.getByRole('button', { name: 'Reopen task' }).click()
  await expect(detail.getByRole('button', { name: 'Mark done' })).toBeVisible()
  await expect(detail.getByRole('button', { name: 'Later', exact: true })).toHaveAttribute('aria-pressed', /^(true|1)$/)
  await expect(page.getByTestId('main-task-list')).toContainText('Saved by completion')
  await page.goBack()
  await expect(page).toHaveURL(listUrl)
  await expect(detail).toHaveCount(0)
  await page.goForward()
  await expect(page).toHaveURL(detailUrl)
  await expect(detail.getByLabel('Title', { exact: true })).toHaveValue(first)
  await detail.getByRole('link', { name: 'Close', exact: true }).click()
  await openTask(page, second)
  await expect(detail.getByLabel('Note (markdown text)')).toHaveValue('')
  await expect(detail.getByRole('status')).toBeEmpty()
  await expect(detail.getByRole('button', { name: 'Later', exact: true })).toHaveAttribute('aria-pressed', /^(false|0)$/)
})
