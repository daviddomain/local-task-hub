import { expect, test } from "@playwright/test"

async function showOnlyTask(page: import("@playwright/test").Page, title: string) {
  await page.goto(`/?q=${encodeURIComponent(title)}`, { waitUntil: "domcontentloaded" })
}

async function openTaskDetail(page: import("@playwright/test").Page, title: string) {
  if ((await page.locator("#task-detail").count()) > 0) {
    await expect(page.locator("#detailTitle")).toHaveValue(title)
    return
  }

  await page.getByTestId('main-task-list').getByRole("link", { name: title }).click()
  await expect(page.getByRole("dialog", { name: "Task detail" })).toBeVisible()
  await expect(page.locator("#detailTitle")).toHaveValue(title)
}

async function closeTaskDetail(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Close" }).click()
  await expect(page.getByRole("dialog", { name: "Task detail" })).toHaveCount(0)
}

test("mark task done and reopen persists status while preserving later flag", async ({ page }) => {
  const unique = Date.now().toString()
  const title = `Issue9 Complete Reopen ${unique}`

  await page.goto("/")
  await showOnlyTask(page, title)

  await page.getByRole("link", { name: "Create task" }).click()
  await expect(page.getByRole("dialog", { name: "Quick add" })).toBeVisible()
  await page.getByLabel("Title *").fill(title)
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST"),
    page.getByRole("button", { name: "Create task" }).click(),
  ])
  await expect(page.getByRole("dialog", { name: "Quick add" })).toHaveCount(0)

  await showOnlyTask(page, title)
  const card = page.getByTestId('main-task-list').locator("li", { hasText: title })
  await expect(card).toBeVisible()
  await expect(card).toContainText("open")

  await openTaskDetail(page, title)

  const laterToggle = page.getByRole("button", { name: "Later" })

  await laterToggle.focus()
  await page.keyboard.press("Space")

  await page.getByRole("button", { name: "Save detail" }).click()
  await expect(laterToggle).toHaveAttribute("aria-pressed", /^(true|1)$/)
  await closeTaskDetail(page)

  await showOnlyTask(page, title)
  await expect(card).toContainText("later")
  await openTaskDetail(page, title)
  await expect(page.locator("#detailStatus")).toContainText("open")
  await expect(page.getByRole("button", { name: "Later" })).toHaveAttribute("aria-pressed", /^(true|1)$/)

  await page.getByRole("button", { name: "Mark done" }).click()
  await expect(page.getByRole("button", { name: "Reopen task" })).toBeVisible()
  await closeTaskDetail(page)

  await showOnlyTask(page, title)
  await expect(card).toContainText("done")
  await expect(card).toContainText("later")
  await openTaskDetail(page, title)
  await expect(page.locator("#detailStatus")).toContainText("done")
  await expect(page.getByRole("button", { name: "Reopen task" })).toBeVisible()

  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator("#detailTitle")).toHaveValue(title)

  await expect(card).toContainText("done")
  await expect(card).toContainText("later")
  await expect(page.locator("#detailStatus")).toContainText("done")
  await expect(page.getByRole("button", { name: "Reopen task" })).toBeVisible()

  await page.getByRole("button", { name: "Reopen task" }).click()
  await expect(page.getByRole("button", { name: "Mark done" })).toBeVisible()
  await closeTaskDetail(page)

  await showOnlyTask(page, title)
  await expect(card).toContainText("open")
  await expect(card).toContainText("later")
  await openTaskDetail(page, title)
  await expect(page.locator("#detailStatus")).toContainText("open")
  await expect(page.getByRole("button", { name: "Later" })).toHaveAttribute("aria-pressed", /^(true|1)$/)

  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator("#detailTitle")).toHaveValue(title)

  const persistedCard = page.getByTestId('main-task-list').locator("li", { hasText: title })
  await expect(persistedCard).toBeVisible()
  await expect(persistedCard).toContainText("open")
  await expect(persistedCard).toContainText("later")
  await expect(page.locator("#detailStatus")).toContainText("open")
  await expect(page.getByRole("button", { name: "Later" })).toHaveAttribute("aria-pressed", /^(true|1)$/)

  await page.getByRole("button", { name: "Later" }).click()
  await page.getByRole("button", { name: "Save detail" }).click()
  await expect(page.getByRole("button", { name: "Later" })).toHaveAttribute("aria-pressed", /^(false|0)$/)
  await closeTaskDetail(page)

  await showOnlyTask(page, title)
  await expect(persistedCard).not.toContainText("later")
  await openTaskDetail(page, title)
  await expect(page.getByRole("button", { name: "Later" })).toHaveAttribute("aria-pressed", /^(false|0)$/)
})

