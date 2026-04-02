import { expect, test } from "@playwright/test"

function buildUnique(testName: string) {
  return `${testName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function submitQuickAdd(page: import("@playwright/test").Page) {
  const createButton = page.getByRole("button", { name: "Create task" })
  await expect(createButton).toBeVisible()
  await createButton.evaluate((element) => {
    ;(element as HTMLButtonElement).click()
  })
}

async function saveTaskDetail(page: import("@playwright/test").Page) {
  const saveButton = page.getByRole("button", { name: "Save detail" })
  await expect(saveButton).toBeVisible()
  await saveButton.evaluate((element) => {
    ;(element as HTMLButtonElement).click()
  })
}

test("start, stop, persist, and edit task time sessions", async ({ page }, testInfo) => {
  const unique = buildUnique(testInfo.project.name)
  const title = `Issue10 Time Tracking ${unique}`

  await page.goto("/")

  await page.getByLabel("Title *").fill(title)
  await submitQuickAdd(page)

  const card = page.locator("li", { hasText: title })
  await expect(card).toBeVisible()
  await expect(card).toContainText("Stopped")
  await expect(card).toContainText("Today: 0m")
  await expect(card).toContainText("Total: 0m")

  await card.getByRole("button", { name: "Start tracking" }).click()
  await expect(card.getByRole("button", { name: "Stop tracking" })).toBeVisible({ timeout: 10000 })

  await page.waitForTimeout(1200)

  await card.getByRole("button", { name: "Stop tracking" }).click()
  await expect(card).toContainText("Stopped")

  await page.getByRole("link", { name: title }).click()

  const sessionRows = page.locator("#task-detail [data-testid='time-session-row']")
  await expect(sessionRows).toHaveCount(1)

  const startedAtRaw = await page.locator("#detailTimeSessionStartedAt-0").inputValue()
  const startedAt = new Date(startedAtRaw)
  const correctedEndedAt = new Date(startedAt.getTime() + 2 * 60 * 1000)

  await page.locator("#detailTimeSessionEndedAt-0").fill(correctedEndedAt.toISOString())
  await page.locator("#detailTimeSessionDuration-0").fill("")
  await saveTaskDetail(page)

  await expect(card).toContainText("Total: 2m")

  await page.reload()

  const persistedCard = page.locator("li", { hasText: title })
  await expect(persistedCard).toContainText("Stopped")
  await expect(persistedCard).toContainText("Total: 2m")

  await page.getByRole("link", { name: title }).click()
  await expect(page.locator("#task-detail [data-testid='time-session-row']")).toHaveCount(1)
  await expect(page.locator("#detailTimeSessionEndedAt-0")).toHaveValue(correctedEndedAt.toISOString())

  await expect(page.getByText("Today total tracked:")).toBeVisible()
})

test("double start submission does not create duplicate running sessions", async ({ page }, testInfo) => {
  const unique = buildUnique(testInfo.project.name)
  const title = `Issue10 Double Start ${unique}`

  await page.goto("/")

  await page.getByLabel("Title *").fill(title)
  await submitQuickAdd(page)

  const card = page.locator("li", { hasText: title })
  await expect(card).toBeVisible()

  await card.getByRole("button", { name: "Start tracking" }).dblclick()

  await expect(card.getByRole("button", { name: "Stop tracking" })).toBeVisible({ timeout: 10000 })

  await page.getByRole("link", { name: title }).click()

  const sessionRows = page.locator("#task-detail [data-testid='time-session-row']")
  await expect(sessionRows).toHaveCount(1)
  await expect(page.locator("#detailTimeSessionEndedAt-0")).toHaveValue("")
  await expect(page.locator("#detailTimeSessionDuration-0")).toHaveValue("")
})

test("double stop submission does not mutate ended session twice", async ({ page }, testInfo) => {
  const unique = buildUnique(testInfo.project.name)
  const title = `Issue10 Double Stop ${unique}`

  await page.goto("/")

  await page.getByLabel("Title *").fill(title)
  await submitQuickAdd(page)

  const card = page.locator("li", { hasText: title })
  await expect(card).toBeVisible()

  await card.getByRole("button", { name: "Start tracking" }).click()
  await expect(card.getByRole("button", { name: "Stop tracking" })).toBeVisible({ timeout: 10000 })

  await page.waitForTimeout(1200)

  await card.getByRole("button", { name: "Stop tracking" }).dblclick()
  await expect(card).toContainText("Stopped")

  await page.getByRole("link", { name: title }).click()

  const sessionRows = page.locator("#task-detail [data-testid='time-session-row']")
  await expect(sessionRows).toHaveCount(1)

  const startedAtRaw = await page.locator("#detailTimeSessionStartedAt-0").inputValue()
  const endedAtRaw = await page.locator("#detailTimeSessionEndedAt-0").inputValue()
  const durationRaw = await page.locator("#detailTimeSessionDuration-0").inputValue()

  expect(endedAtRaw).not.toBe("")
  expect(durationRaw).toMatch(/^\d+$/)

  const startedAt = new Date(startedAtRaw)
  const endedAt = new Date(endedAtRaw)
  const durationSeconds = Number.parseInt(durationRaw, 10)

  const expectedSeconds = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000))
  expect(durationSeconds).toBe(expectedSeconds)
})

test("today totals include overlap for sessions that started before midnight", async ({ page }, testInfo) => {
  const unique = buildUnique(testInfo.project.name)
  const title = `Issue10 Midnight Overlap ${unique}`

  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(0, 0, 0, 0)

  const startedAt = new Date(midnight.getTime() - 10 * 60 * 1000)
  const endedAt = new Date(midnight.getTime() + 10 * 60 * 1000)

  await page.goto("/")

  await page.getByLabel("Title *").fill(title)
  await submitQuickAdd(page)

  const card = page.locator("li", { hasText: title })
  await expect(card).toBeVisible()

  await card.getByRole("button", { name: "Start tracking" }).click()
  await expect(card.getByRole("button", { name: "Stop tracking" })).toBeVisible({ timeout: 10000 })
  await page.waitForTimeout(1100)
  await card.getByRole("button", { name: "Stop tracking" }).click()

  await page.getByRole("link", { name: title }).click()

  await expect(page.locator("#task-detail [data-testid='time-session-row']")).toHaveCount(1)
  await page.locator("#detailTimeSessionStartedAt-0").fill(startedAt.toISOString())
  await page.locator("#detailTimeSessionEndedAt-0").fill(endedAt.toISOString())
  await page.locator("#detailTimeSessionDuration-0").fill("")

  await saveTaskDetail(page)

  await expect(card).toContainText("Today: 10m")
  await expect(card).toContainText("Total: 20m")
})

test("editing only endedAt recomputes persisted duration and updates totals", async ({ page }, testInfo) => {
  const unique = buildUnique(testInfo.project.name)
  const title = `Issue10 EndedAt Recompute ${unique}`

  await page.goto("/")

  await page.getByLabel("Title *").fill(title)
  await submitQuickAdd(page)

  const card = page.locator("li", { hasText: title })

  await card.getByRole("button", { name: "Start tracking" }).click()
  await expect(card.getByRole("button", { name: "Stop tracking" })).toBeVisible({ timeout: 10000 })

  await page.waitForTimeout(1200)
  await card.getByRole("button", { name: "Stop tracking" }).click()

  await page.getByRole("link", { name: title }).click()

  const startedAtRaw = await page.locator("#detailTimeSessionStartedAt-0").inputValue()
  const startedAt = new Date(startedAtRaw)
  const editedEndedAt = new Date(startedAt.getTime() + 10 * 60 * 1000)

  await page.locator("#detailTimeSessionEndedAt-0").fill(editedEndedAt.toISOString())
  await page.locator("#detailTimeSessionDuration-0").fill("1")
  await saveTaskDetail(page)

  await expect(card).toContainText("Total: 10m")

  await page.reload()
  const persistedCard = page.locator("li", { hasText: title })
  await expect(persistedCard).toContainText("Total: 10m")
})
