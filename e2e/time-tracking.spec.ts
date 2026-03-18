import { expect, test } from "@playwright/test"

function buildUnique(testName: string) {
  return `${testName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function saveTaskDetail(page: import("@playwright/test").Page) {
  const saveButton = page.getByRole("button", { name: "Save detail" })
  await saveButton.scrollIntoViewIfNeeded()
  await saveButton.click()
}

test("start, stop, persist, and edit task time sessions", async ({ page }, testInfo) => {
  const unique = buildUnique(testInfo.project.name)
  const title = `Issue10 Time Tracking ${unique}`

  await page.goto("/")

  await page.getByLabel("Title *").fill(title)
  await page.getByRole("button", { name: "Create task" }).click()

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

  const timeSessionsInput = page.locator("#detailTimeSessions")
  await expect(timeSessionsInput).not.toHaveValue("")

  const originalSession = await timeSessionsInput.inputValue()
  const [firstLine] = originalSession.split("\n")
  const [startedAtRaw] = firstLine.split("|")

  const startedAt = new Date(startedAtRaw)
  const correctedEndedAt = new Date(startedAt.getTime() + 2 * 60 * 1000)

  await timeSessionsInput.fill(`${startedAtRaw}|${correctedEndedAt.toISOString()}|`)
  await saveTaskDetail(page)

  await expect(card).toContainText("Total: 2m")

  await page.reload()

  const persistedCard = page.locator("li", { hasText: title })
  await expect(persistedCard).toContainText("Stopped")
  await expect(persistedCard).toContainText("Total: 2m")

  await page.getByRole("link", { name: title }).click()
  await expect(page.locator("#detailTimeSessions")).toContainText(correctedEndedAt.toISOString())

  await expect(page.getByText("Today total tracked:")).toBeVisible()
})

test("double start submission does not create duplicate running sessions", async ({ page }, testInfo) => {
  const unique = buildUnique(testInfo.project.name)
  const title = `Issue10 Double Start ${unique}`

  await page.goto("/")

  await page.getByLabel("Title *").fill(title)
  await page.getByRole("button", { name: "Create task" }).click()

  const card = page.locator("li", { hasText: title })
  await expect(card).toBeVisible()

  await card.getByRole("button", { name: "Start tracking" }).dblclick()

  await expect(card.getByRole("button", { name: "Stop tracking" })).toBeVisible({ timeout: 10000 })

  await page.getByRole("link", { name: title }).click()

  const sessionsRaw = await page.locator("#detailTimeSessions").inputValue()
  const sessionLines = sessionsRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  expect(sessionLines).toHaveLength(1)
  expect(sessionLines[0]).toMatch(/^.+\|\|$/)
})

test("double stop submission does not mutate ended session twice", async ({ page }, testInfo) => {
  const unique = buildUnique(testInfo.project.name)
  const title = `Issue10 Double Stop ${unique}`

  await page.goto("/")

  await page.getByLabel("Title *").fill(title)
  await page.getByRole("button", { name: "Create task" }).click()

  const card = page.locator("li", { hasText: title })
  await expect(card).toBeVisible()

  await card.getByRole("button", { name: "Start tracking" }).click()
  await expect(card.getByRole("button", { name: "Stop tracking" })).toBeVisible({ timeout: 10000 })

  await page.waitForTimeout(1200)

  await card.getByRole("button", { name: "Stop tracking" }).dblclick()
  await expect(card).toContainText("Stopped")

  await page.getByRole("link", { name: title }).click()

  const sessionsRaw = await page.locator("#detailTimeSessions").inputValue()
  const sessionLines = sessionsRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  expect(sessionLines).toHaveLength(1)
  expect(sessionLines[0]).toMatch(/^.+\|.+\|\d+$/)

  const [startedAtRaw, endedAtRaw, durationRaw] = sessionLines[0].split("|")
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
  await page.getByRole("button", { name: "Create task" }).click()

  await page.getByRole("link", { name: title }).click()

  await page
    .locator("#detailTimeSessions")
    .fill(`${startedAt.toISOString()}|${endedAt.toISOString()}|`)

  await saveTaskDetail(page)

  const card = page.locator("li", { hasText: title })
  await expect(card).toContainText("Today: 10m")
  await expect(card).toContainText("Total: 20m")
})

test("editing only endedAt recomputes persisted duration and updates totals", async ({ page }, testInfo) => {
  const unique = buildUnique(testInfo.project.name)
  const title = `Issue10 EndedAt Recompute ${unique}`

  await page.goto("/")

  await page.getByLabel("Title *").fill(title)
  await page.getByRole("button", { name: "Create task" }).click()

  const card = page.locator("li", { hasText: title })

  await card.getByRole("button", { name: "Start tracking" }).click()
  await expect(card.getByRole("button", { name: "Stop tracking" })).toBeVisible({ timeout: 10000 })

  await page.waitForTimeout(1200)
  await card.getByRole("button", { name: "Stop tracking" }).click()

  await page.getByRole("link", { name: title }).click()

  const timeSessionsInput = page.locator("#detailTimeSessions")
  const original = await timeSessionsInput.inputValue()
  const [firstLine] = original.split("\n")
  const [startedAtRaw] = firstLine.split("|")

  const startedAt = new Date(startedAtRaw)
  const editedEndedAt = new Date(startedAt.getTime() + 10 * 60 * 1000)

  await timeSessionsInput.fill(`${startedAtRaw}|${editedEndedAt.toISOString()}|1`)
  await saveTaskDetail(page)

  await expect(card).toContainText("Total: 10m")

  await page.reload()
  const persistedCard = page.locator("li", { hasText: title })
  await expect(persistedCard).toContainText("Total: 10m")
})
