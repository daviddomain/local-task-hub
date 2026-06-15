import { expect, test } from "@playwright/test"
import mysql from "mysql2/promise"

function buildUnique(testName: string) {
  return `${testName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatDateTimeLocalValue(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  const hours = String(value.getHours()).padStart(2, "0")
  const minutes = String(value.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function formatDisplayDateTimeValue(value: string) {
  const [date, time] = value.split("T")
  const [year, month, day] = date.split("-")

  return `${day}.${month}.${year} ${time}`
}

async function setTaskDateTimePickerTime(
  page: import("@playwright/test").Page,
  id: string,
  hour: number,
  minute: 0 | 15 | 30 | 45
) {
  await page.locator(`#${id}`).click()
  const popover = page.locator("[data-slot='popover-content']")
  await expect(popover).toBeVisible()
  await popover.getByRole("button", { name: `Select hour ${String(hour).padStart(2, "0")}` }).click()
  await popover.getByRole("button", { name: `Select minute ${String(minute).padStart(2, "0")}` }).click()
  await page.keyboard.press("Escape")
  await expect(popover).toHaveCount(0)
}

async function withDbConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST ?? process.env.MYSQL_HOST ?? "127.0.0.1",
    port: Number.parseInt(process.env.DB_PORT ?? process.env.MYSQL_PORT ?? "3306", 10),
    user: process.env.DB_USER ?? process.env.MYSQL_USER ?? "root",
    password: process.env.DB_PASSWORD ?? process.env.MYSQL_PASSWORD ?? "localtaskhub",
    database: process.env.DB_NAME ?? process.env.MYSQL_DATABASE ?? "local-task-hub"
  })
}

async function submitQuickAdd(page: import("@playwright/test").Page) {
  const createButton = page.getByRole("button", { name: "Create task" })
  await expect(createButton).toBeVisible()
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST"),
    createButton.click(),
  ])
  await expect(page.getByRole("dialog", { name: "Quick add" })).toHaveCount(0)
}

async function openQuickAdd(page: import("@playwright/test").Page) {
  await page.getByRole("link", { name: "Create task" }).click()
  const quickAdd = page.getByRole("dialog", { name: "Quick add" })
  await expect(quickAdd).toBeVisible()
  await expect(quickAdd.getByLabel("Title *")).toBeEditable()
}

async function showOnlyTask(page: import("@playwright/test").Page, title: string) {
  await page.goto(`/?q=${encodeURIComponent(title)}`, { waitUntil: "domcontentloaded" })
}

async function saveTaskDetail(page: import("@playwright/test").Page) {
  const saveButton = page.getByRole("button", { name: "Save detail" })
  await expect(saveButton).toBeVisible()
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST"),
    saveButton.click(),
  ])
}

async function openTaskDetail(page: import("@playwright/test").Page, title: string) {
  await page.getByTestId('main-task-list').getByRole("link", { name: title }).click()
  await expect(page.getByRole("dialog", { name: "Task detail" })).toBeVisible()
  await expect(page.locator("#detailTitle")).toHaveValue(title)
}

async function setMidnightOverlapSession(title: string) {
  const connection = await withDbConnection()

  try {
    const [taskRows] = await connection.query<Array<{ id: number }>>(
      "SELECT id FROM tasks WHERE title = ? ORDER BY id DESC LIMIT 1",
      [title]
    )
    const taskId = taskRows[0]?.id

    expect(taskId).toBeTruthy()

    const [updateResult] = await connection.execute<mysql.ResultSetHeader>(
      `
        UPDATE task_time_sessions
        SET
          started_at = DATE_SUB(CURRENT_DATE(), INTERVAL 10 MINUTE),
          ended_at = DATE_ADD(CURRENT_DATE(), INTERVAL 10 MINUTE),
          duration_seconds = 20 * 60
        WHERE task_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
      [taskId]
    )

    expect(updateResult.affectedRows).toBe(1)
  } finally {
    await connection.end()
  }
}

test("start, stop, persist, and edit task time sessions", async ({ page }, testInfo) => {
  const unique = buildUnique(testInfo.project.name)
  const title = `Issue10 Time Tracking ${unique}`

  await page.goto("/")
  await showOnlyTask(page, title)

  await openQuickAdd(page)
  await page.getByLabel("Title *").fill(title)
  await submitQuickAdd(page)

  await showOnlyTask(page, title)
  const card = page.getByTestId('main-task-list').locator("li", { hasText: title })
  await expect(card).toBeVisible()
  await expect(card).toContainText("Stopped")
  await expect(card).toContainText("Today: 0m")
  await expect(card).toContainText("Total: 0m")

  await card.getByRole("button", { name: "Start tracking" }).click()
  await expect(card.getByRole("button", { name: "Stop tracking" })).toBeVisible({ timeout: 10000 })

  await page.waitForTimeout(1200)

  await card.getByRole("button", { name: "Stop tracking" }).click()
  await expect(card).toContainText("Stopped")

  await openTaskDetail(page, title)

  const sessionRows = page.locator("#task-detail [data-testid='time-session-row']")
  await expect(sessionRows).toHaveCount(1)

  const startedAtRaw = await page.getByTestId("detailTimeSessionStartedAt-0-value").inputValue()
  const sessionDate = new Date(startedAtRaw)
  const correctedStartedAt = new Date(sessionDate)
  correctedStartedAt.setHours(3, 0, 0, 0)
  const correctedStartedAtInput = formatDateTimeLocalValue(correctedStartedAt)
  const correctedEndedAt = new Date(sessionDate)
  correctedEndedAt.setHours(4, 0, 0, 0)
  const correctedEndedAtInput = formatDateTimeLocalValue(correctedEndedAt)

  await setTaskDateTimePickerTime(page, "detailTimeSessionStartedAt-0", 3, 0)
  await setTaskDateTimePickerTime(
    page,
    "detailTimeSessionEndedAt-0",
    correctedEndedAt.getHours(),
    correctedEndedAt.getMinutes() as 0 | 15 | 30 | 45
  )
  await saveTaskDetail(page)

  await showOnlyTask(page, title)
  await expect(card).toContainText("Total: 1h 0m")

  await page.reload({ waitUntil: "domcontentloaded" })

  const persistedCard = page.getByTestId('main-task-list').locator("li", { hasText: title })
  await expect(persistedCard).toContainText("Stopped")
  await expect(persistedCard).toContainText("Total: 1h 0m")

  await openTaskDetail(page, title)
  await expect(page.locator("#task-detail [data-testid='time-session-row']")).toHaveCount(1)
  await expect(page.getByTestId("detailTimeSessionStartedAt-0-value")).toHaveValue(correctedStartedAtInput)
  await expect(page.locator("#detailTimeSessionStartedAt-0")).toHaveValue(
    formatDisplayDateTimeValue(correctedStartedAtInput)
  )
  await expect(page.getByTestId("detailTimeSessionEndedAt-0-value")).toHaveValue(correctedEndedAtInput)
  await expect(page.locator("#detailTimeSessionEndedAt-0")).toHaveValue(
    formatDisplayDateTimeValue(correctedEndedAtInput)
  )
  await expect(page.getByTestId("time-session-duration")).toHaveText("1h 0m")

  await expect(page.getByText("Today total tracked:")).toBeVisible()
})

test("double start submission does not create duplicate running sessions", async ({ page }, testInfo) => {
  const unique = buildUnique(testInfo.project.name)
  const title = `Issue10 Double Start ${unique}`

  await page.goto("/")
  await showOnlyTask(page, title)

  await openQuickAdd(page)
  await page.getByLabel("Title *").fill(title)
  await submitQuickAdd(page)

  await showOnlyTask(page, title)
  const card = page.getByTestId('main-task-list').locator("li", { hasText: title })
  await expect(card).toBeVisible()

  await card.getByRole("button", { name: "Start tracking" }).dblclick()

  await expect(card.getByRole("button", { name: "Stop tracking" })).toBeVisible({ timeout: 10000 })

  await openTaskDetail(page, title)

  const sessionRows = page.locator("#task-detail [data-testid='time-session-row']")
  await expect(sessionRows).toHaveCount(1)
  await expect(page.getByTestId("detailTimeSessionEndedAt-0-value")).toHaveValue("")
  await expect(page.locator("#detailTimeSessionEndedAt-0")).toHaveValue("")
  await expect(page.getByTestId("time-session-duration")).toHaveText("Running")
})

test("double stop submission does not mutate ended session twice", async ({ page }, testInfo) => {
  const unique = buildUnique(testInfo.project.name)
  const title = `Issue10 Double Stop ${unique}`

  await page.goto("/")
  await showOnlyTask(page, title)

  await openQuickAdd(page)
  await page.getByLabel("Title *").fill(title)
  await submitQuickAdd(page)

  await showOnlyTask(page, title)
  const card = page.getByTestId('main-task-list').locator("li", { hasText: title })
  await expect(card).toBeVisible()

  await card.getByRole("button", { name: "Start tracking" }).click()
  await expect(card.getByRole("button", { name: "Stop tracking" })).toBeVisible({ timeout: 10000 })

  await page.waitForTimeout(1200)

  await card.getByRole("button", { name: "Stop tracking" }).dblclick()
  await expect(card).toContainText("Stopped")

  await openTaskDetail(page, title)

  const sessionRows = page.locator("#task-detail [data-testid='time-session-row']")
  await expect(sessionRows).toHaveCount(1)

  const startedAtRaw = await page.getByTestId("detailTimeSessionStartedAt-0-value").inputValue()
  const endedAtRaw = await page.getByTestId("detailTimeSessionEndedAt-0-value").inputValue()

  expect(endedAtRaw).not.toBe("")

  const startedAt = new Date(startedAtRaw)
  const endedAt = new Date(endedAtRaw)

  const expectedSeconds = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000))
  await expect(page.getByTestId("time-session-duration")).toHaveText(
    expectedSeconds >= 60 ? /\d+m/ : "0m"
  )
})

test("today totals include overlap for sessions that started before midnight", async ({ page }, testInfo) => {
  const unique = buildUnique(testInfo.project.name)
  const title = `Issue10 Midnight Overlap ${unique}`

  await page.goto("/")
  await showOnlyTask(page, title)

  await openQuickAdd(page)
  await page.getByLabel("Title *").fill(title)
  await submitQuickAdd(page)

  await showOnlyTask(page, title)
  const card = page.getByTestId('main-task-list').locator("li", { hasText: title })
  await expect(card).toBeVisible()

  await card.getByRole("button", { name: "Start tracking" }).click()
  await expect(card.getByRole("button", { name: "Stop tracking" })).toBeVisible({ timeout: 10000 })
  await page.waitForTimeout(1100)
  await card.getByRole("button", { name: "Stop tracking" }).click()

  await setMidnightOverlapSession(title)

  await showOnlyTask(page, title)
  await expect(card).toContainText("Today: 10m")
  await expect(card).toContainText("Total: 20m")
})

test("editing only endedAt recomputes persisted duration and updates totals", async ({ page }, testInfo) => {
  const unique = buildUnique(testInfo.project.name)
  const title = `Issue10 EndedAt Recompute ${unique}`

  await page.goto("/")
  await showOnlyTask(page, title)

  await openQuickAdd(page)
  await page.getByLabel("Title *").fill(title)
  await submitQuickAdd(page)

  await showOnlyTask(page, title)
  const card = page.getByTestId('main-task-list').locator("li", { hasText: title })

  await card.getByRole("button", { name: "Start tracking" }).click()
  await expect(card.getByRole("button", { name: "Stop tracking" })).toBeVisible({ timeout: 10000 })

  await page.waitForTimeout(1200)
  await card.getByRole("button", { name: "Stop tracking" }).click()

  await openTaskDetail(page, title)

  await setTaskDateTimePickerTime(page, "detailTimeSessionStartedAt-0", 3, 0)
  const startedAtRaw = await page.getByTestId("detailTimeSessionStartedAt-0-value").inputValue()
  const editedEndedAt = new Date(startedAtRaw)
  editedEndedAt.setHours(4, 0, 0, 0)

  await setTaskDateTimePickerTime(
    page,
    "detailTimeSessionEndedAt-0",
    editedEndedAt.getHours(),
    editedEndedAt.getMinutes() as 0 | 15 | 30 | 45
  )
  await saveTaskDetail(page)

  await showOnlyTask(page, title)
  await expect(card).toContainText("Total: 1h 0m")

  await page.reload({ waitUntil: "domcontentloaded" })
  const persistedCard = page.getByTestId('main-task-list').locator("li", { hasText: title })
  await expect(persistedCard).toContainText("Total: 1h 0m")
})
