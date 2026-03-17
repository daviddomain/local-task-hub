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
  await page.locator("#detailStatus").selectOption("blocked")
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
  await expect(page.locator("#detailStatus")).toHaveValue("blocked")
  await expect(page.getByRole("checkbox", { name: "Later" })).toHaveAttribute("aria-checked", /^(true|1)$/)
  await expect(page.locator("#detailNote")).toHaveValue("# heading\nmarkdown note")
  await expect(page.locator("#detailLinks")).toHaveValue(
    "https://github.com/vercel/next.js\nhttps://gitlab.com/gitlab-org/gitlab",
  )
  await expect(page.locator("#detailTags")).toHaveValue("backend, persistence")
  await expect(page.locator("#detailPeople")).toHaveValue("@anna, @max")
})
