import { expect, test } from "@playwright/test"

test("task detail view persists phase 1 fields and restores after reload", async ({ page }) => {
  const unique = Date.now().toString()
  const initialTitle = `Issue7 Detail ${unique}`
  const updatedTitle = `${initialTitle} Updated`

  await page.goto("/")

  await page.getByLabel("Title *").fill(initialTitle)
  await page.getByRole("button", { name: "Create task" }).click()

  await page.getByRole("link", { name: initialTitle }).click()

  await expect(page.getByText("Task detail").first()).toBeVisible()

  await page.locator("#detailTitle").fill(updatedTitle)
  await page.locator("#detailStatus").selectOption("blocked")
  await page.locator("#detailLater").click()
  await page.locator("#detailNote").fill("# heading\nmarkdown note")
  await page
    .locator("#detailLinks")
    .fill("https://github.com/vercel/next.js\nhttps://gitlab.com/gitlab-org/gitlab")
  await page.locator("#detailTags").fill("backend, persistence")
  await page.locator("#detailPeople").fill("@anna, @max")
  await page
    .locator("#detailTimeSessions")
    .fill("2026-03-16T08:00:00.000Z|2026-03-16T09:30:00.000Z|5400")

  await page.getByRole("button", { name: "Save detail" }).click()

  const updatedCard = page.locator("li", { hasText: updatedTitle })
  await expect(updatedCard).toBeVisible()
  await expect(updatedCard).toContainText("blocked")
  await expect(updatedCard).toContainText("later")

  await page.reload()

  await page.getByRole("link", { name: updatedTitle }).click()

  await expect(page.locator("#detailTitle")).toHaveValue(updatedTitle)
  await expect(page.locator("#detailStatus")).toHaveValue("blocked")
  await expect(page.getByRole("checkbox", { name: "Later" })).toHaveAttribute("aria-checked", /^(true|1)$/)
  await expect(page.locator("li", { hasText: updatedTitle })).toContainText("later")
  await expect(page.locator("#detailNote")).toHaveValue("# heading\nmarkdown note")
  await expect(page.locator("#detailLinks")).toHaveValue(
    "https://github.com/vercel/next.js\nhttps://gitlab.com/gitlab-org/gitlab",
  )
  await expect(page.locator("#detailTags")).toHaveValue("backend, persistence")
  await expect(page.locator("#detailPeople")).toHaveValue("@anna, @max")
  await expect(page.locator("#detailTimeSessions")).toHaveValue(
    "2026-03-16T08:00:00.000Z|2026-03-16T09:30:00.000Z|5400",
  )

  await expect(page.locator("#task-detail").getByText("Created", { exact: true })).toBeVisible()
  await expect(page.locator("#task-detail").getByText("Updated", { exact: true })).toBeVisible()
})
