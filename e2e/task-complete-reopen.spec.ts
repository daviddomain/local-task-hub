import { expect, test } from "@playwright/test"

test("mark task done and reopen persists status while preserving later flag", async ({ page }) => {
  const unique = Date.now().toString()
  const title = `Issue9 Complete Reopen ${unique}`

  await page.goto("/")

  await page.getByLabel("Title *").fill(title)
  await page.getByRole("button", { name: "Create task" }).click()

  const card = page.locator("li", { hasText: title })
  await expect(card).toBeVisible()
  await expect(card).toContainText("open")

  await page.getByRole("link", { name: title }).click()

  await page.locator("#detailLater").focus()
  await page.keyboard.press("Space")

  await page.getByRole("button", { name: "Save detail" }).click()

  await expect(card).toContainText("later")
  await expect(page.locator("#detailStatus")).toHaveValue("open")
  await expect(page.getByRole("checkbox", { name: "Later" })).toHaveAttribute("aria-checked", /^(true|1)$/)

  await page.getByRole("button", { name: "Mark done" }).click()

  await expect(card).toContainText("done")
  await expect(card).toContainText("later")
  await expect(page.locator("#detailStatus")).toHaveValue("done")
  await expect(page.getByRole("button", { name: "Reopen task" })).toBeVisible()

  await page.reload()
  await page.getByRole("link", { name: title }).click()

  await expect(card).toContainText("done")
  await expect(card).toContainText("later")
  await expect(page.locator("#detailStatus")).toHaveValue("done")
  await expect(page.getByRole("button", { name: "Reopen task" })).toBeVisible()

  await page.getByRole("button", { name: "Reopen task" }).click()

  await expect(card).toContainText("open")
  await expect(card).toContainText("later")
  await expect(page.locator("#detailStatus")).toHaveValue("open")
  await expect(page.getByRole("checkbox", { name: "Later" })).toHaveAttribute("aria-checked", /^(true|1)$/)

  await page.reload()
  await page.getByRole("link", { name: title }).click()

  const persistedCard = page.locator("li", { hasText: title })
  await expect(persistedCard).toBeVisible()
  await expect(persistedCard).toContainText("open")
  await expect(persistedCard).toContainText("later")
  await expect(page.locator("#detailStatus")).toHaveValue("open")
  await expect(page.getByRole("checkbox", { name: "Later" })).toHaveAttribute("aria-checked", /^(true|1)$/)
})
