import { expect, test } from "@playwright/test"

test("task detail edit flow persists Phase 1 fields and updates task metadata", async ({ page }) => {
  const unique = Date.now().toString()
  const initialTitle = `Issue8 Edit ${unique}`
  const updatedTitle = `${initialTitle} Updated`

  await page.goto("/")

  await page.getByLabel("Title *").fill(initialTitle)
  await page.getByRole("button", { name: "Create task" }).click()

  await page.getByRole("link", { name: initialTitle }).click()

  await expect(page.getByText("Task detail").first()).toBeVisible()

  const updatedAtRow = page
    .locator("#task-detail dl > div")
    .filter({ has: page.getByText("Updated", { exact: true }) })

  const updatedAtBefore = await updatedAtRow.locator("time").getAttribute("dateTime")

  await page.locator("#detailTitle").fill(updatedTitle)
  const statusControl = page.locator("#task-detail [aria-label='Status']")
  await statusControl.click()
  await page.getByRole("option", { name: "blocked" }).click()
  await page.locator("#detailNote").fill("# heading\nmarkdown note")
  await page
    .locator("#detailLinks")
    .fill("https://github.com/vercel/next.js\nhttps://gitlab.com/gitlab-org/gitlab")
  await page.locator("#detailTags").fill("backend, persistence")
  await page.locator("#detailPeople").fill("@anna, @max")

  await page.locator("#detailLater").focus()
  await page.keyboard.press("Space")

  // Intentionally wait past one second so formatted and ISO timestamps can change on save.
  await page.waitForTimeout(1100)

  await page.getByRole("button", { name: "Save detail" }).focus()
  await page.keyboard.press("Enter")

  const updatedCard = page.locator("li", { hasText: updatedTitle })
  await expect(updatedCard).toBeVisible()
  await expect(updatedCard).toContainText("blocked")
  await expect(updatedCard).toContainText("later")
  await expect(updatedCard).toContainText("#backend")
  await expect(updatedCard).toContainText("@anna")

  const updatedAtAfter = await updatedAtRow.locator("time").getAttribute("dateTime")
  expect(updatedAtAfter).not.toEqual(updatedAtBefore)

  await page.reload()

  await page.getByRole("link", { name: updatedTitle }).click()

  await expect(page.locator("#detailTitle")).toHaveValue(updatedTitle)
  await expect(page.locator("#task-detail [aria-label='Status']")).toContainText("blocked")
  await expect(page.getByRole("checkbox", { name: "Later" })).toHaveAttribute("aria-checked", /^(true|1)$/)
  await expect(page.locator("#detailNote")).toHaveValue("# heading\nmarkdown note")
  await expect(page.locator("#detailLinks")).toHaveValue(
    "https://github.com/vercel/next.js\nhttps://gitlab.com/gitlab-org/gitlab",
  )
  await expect(page.locator("#detailTags")).toHaveValue("backend, persistence")
  await expect(page.locator("#detailPeople")).toHaveValue("@anna, @max")
})

test("task detail structured time sessions support edit and explicit removal", async ({ page }) => {
  const unique = Date.now().toString()
  const taskTitle = "Issue35 Sessions " + unique

  await page.goto("/")

  await page.getByLabel("Title *").fill(taskTitle)
  await page.getByRole("button", { name: "Create task" }).click()

  const createdTaskCard = page.locator("li", { hasText: taskTitle })
  await expect(createdTaskCard).toBeVisible()

  await createdTaskCard.getByRole("button", { name: "Start tracking" }).click()
  await page.waitForTimeout(1100)
  await createdTaskCard.getByRole("button", { name: "Stop tracking" }).click()

  await page.getByRole("link", { name: taskTitle }).click()

  await expect(page.locator("#task-detail [data-testid='time-session-row']")).toHaveCount(1)

  const startedAt = "2026-01-02T03:04:05.000Z"
  const endedAt = "2026-01-02T04:04:05.000Z"

  await page.locator("#detailTimeSessionStartedAt-0").fill(startedAt)
  await page.locator("#detailTimeSessionEndedAt-0").fill(endedAt)
  await page.locator("#detailTimeSessionDuration-0").fill("3600")

  await page.getByRole("button", { name: "Save detail" }).click()

  await page.reload()
  await page.getByRole("link", { name: taskTitle }).click()

  await expect(page.locator("#detailTimeSessionStartedAt-0")).toHaveValue(startedAt)
  await expect(page.locator("#detailTimeSessionEndedAt-0")).toHaveValue(endedAt)
  await expect(page.locator("#detailTimeSessionDuration-0")).toHaveValue("3600")

  await page.locator("#detailTimeSessionRemove-0").check()
  await page.getByRole("button", { name: "Save detail" }).click()

  await page.reload()
  await page.getByRole("link", { name: taskTitle }).click()

  await expect(page.locator("#task-detail [data-testid='time-session-row']")).toHaveCount(0)
  await expect(page.getByText("No time sessions yet.")).toBeVisible()
})
