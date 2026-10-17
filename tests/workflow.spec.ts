import { test, expect, type Page } from "@playwright/test";

async function sample(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Try sample data", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Alex Morgan", exact: true }),
  ).toBeVisible();
}

test("command palette opens a record and Back returns to the list", async ({
  page,
}) => {
  await sample(page);
  await page.keyboard.press("Control+k");
  await page
    .getByRole("combobox", { name: "Search records and commands" })
    .fill("alex morgan");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toContainText("Alex Morgan");
  await expect(page).toHaveURL(/#candidates\/.+/);
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/#candidates$/);
});

test("a record deep link opens after reload and Escape clears it", async ({
  page,
}) => {
  await sample(page);
  await page.getByRole("button", { name: "Alex Morgan", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("dialog")).toContainText("Alex Morgan");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/#candidates$/);
});

test("Today lists follow-ups and snoozing moves one with undo", async ({
  page,
}) => {
  await sample(page);
  await page.getByRole("button", { name: /^Today/ }).click();
  await expect(page.getByRole("heading", { name: /^Today/ })).toBeVisible();
  const overdue = page.locator(".today-section[data-bucket=overdue] li");
  const before = await overdue.count();
  expect(before).toBeGreaterThan(0);
  await overdue
    .first()
    .getByRole("button", { name: /by 1 week$/ })
    .click();
  await expect(overdue).toHaveCount(before - 1);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(overdue).toHaveCount(before);
});

test("bulk selection sets status with undo and can remove sample records", async ({
  page,
}) => {
  await sample(page);
  await page.getByLabel("Select Alex Morgan").check();
  await page.getByLabel("Select Avery Kim").check();
  const bar = page.getByRole("region", { name: "Bulk actions" });
  await expect(bar).toContainText("2 candidates selected");
  await bar.getByRole("combobox").click();
  await page.getByRole("option", { name: "Not open" }).click();
  await expect(
    page.locator("tr", { hasText: "Alex Morgan" }).getByRole("combobox"),
  ).toContainText("Not open");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(
    page.locator("tr", { hasText: "Alex Morgan" }).getByRole("combobox"),
  ).not.toContainText("Not open");
  await page
    .getByRole("button", { name: "Settings & data", exact: true })
    .click();
  await page.getByRole("button", { name: "Remove sample records" }).click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(
    page.getByRole("button", { name: "Remove sample records" }),
  ).toHaveCount(0);
});

test("applications board moves a card with the keyboard", async ({ page }) => {
  await sample(page);
  await page.getByRole("button", { name: /^Applications/ }).click();
  await page.getByRole("button", { name: "Board", exact: true }).click();
  const card = page.getByRole("button", { name: /^Open Casey Tran/ });
  await expect(
    page.getByRole("region", { name: /^Sourced/ }).getByRole("button", {
      name: /^Open Casey Tran/,
    }),
  ).toBeVisible();
  await card.focus();
  await page.keyboard.press("Alt+ArrowRight");
  await expect(
    page.getByRole("region", { name: /^Contacted/ }).getByRole("button", {
      name: /^Open Casey Tran/,
    }),
  ).toBeVisible();
});

test("candidate list shows CPM links, contact dots and a sortable Updated column", async ({
  page,
}) => {
  await sample(page);
  const table = page.locator("table.candidate-table");
  await expect(
    table.getByRole("columnheader", { name: "CPM link" }),
  ).toBeVisible();
  const link = table.getByRole("link", { name: /DEMO-1001 for Alex Morgan/ });
  await expect(link).toHaveAttribute(
    "href",
    "https://cbtwapac.atlassian.net/browse/DEMO-1001",
  );
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);

  const dot = table.getByRole("button", {
    name: "Alex Morgan: not contacted yet",
  });
  await dot.focus();
  await expect(page.getByRole("tooltip")).toContainText("Not contacted yet");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);

  const updated = table.getByRole("columnheader").last();
  await expect(updated).toContainText("Updated");
  await updated.getByRole("button").click();
  await expect(updated.getByRole("button")).toHaveAccessibleName(
    /sorted descending/,
  );
  await updated.getByRole("button").click();
  await expect(updated.getByRole("button")).toHaveAccessibleName(
    /sorted ascending/,
  );
});

test("LinkedIn URL is edited in details and opens in a new tab from the list", async ({
  page,
}) => {
  await sample(page);
  await page.getByRole("button", { name: "Open Alex Morgan" }).click();
  await page
    .getByLabel("LinkedIn URL", { exact: true })
    .fill("linkedin.com/in/alex-morgan");
  await expect(
    page.getByText("All changes saved", { exact: true }).first(),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  const link = page.getByRole("link", {
    name: "Open LinkedIn profile of Alex Morgan (new tab)",
  });
  await expect(link).toHaveAttribute(
    "href",
    "https://linkedin.com/in/alex-morgan",
  );
  await expect(link).toHaveAttribute("target", "_blank");
});

test("Delete all data requires typing DELETE", async ({ page }) => {
  await sample(page);
  await page
    .getByRole("button", { name: "Settings & data", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete all data" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Delete everything" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
  await confirm.click();
  await expect(page.getByText("All data deleted").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete all data" }),
  ).toBeDisabled();
});
