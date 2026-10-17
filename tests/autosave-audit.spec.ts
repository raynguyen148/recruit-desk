import { test, expect, type Page } from "@playwright/test";
async function sample(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Try sample data", exact: true })
    .click();
  await page.getByLabel("Salary for Alex Morgan", { exact: true }).waitFor();
}
async function rename(page: Page) {
  await page
    .getByRole("dialog")
    .getByLabel("Full name", { exact: true })
    .fill("Renamed Candidate");
  await page
    .getByRole("dialog")
    .getByLabel("Full name", { exact: true })
    .press("Tab");
}
test("filtered row removal saves its pending field instead of losing it", async ({
  page,
  context,
}) => {
  await sample(page);
  const other = await context.newPage();
  await other.goto("/");
  await other.getByRole("button", { name: "Alex Morgan", exact: true }).click();
  await page
    .getByRole("textbox", { name: /^Search.*CPM ID/ })
    .fill("Alex Morgan");
  await expect(page.getByLabel("Salary for Avery Kim")).toHaveCount(0);
  await page
    .getByLabel("Salary for Alex Morgan", { exact: true })
    .fill("AUDIT unsaved phone");
  await rename(other);
  await expect(
    page.getByLabel("Salary for Alex Morgan", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: /^Search.*CPM ID/ }).fill("");
  await expect(
    page.getByLabel("Salary for Renamed Candidate", { exact: true }),
  ).toHaveValue("AUDIT unsaved phone");
  await page.reload();
  await expect(
    page.getByLabel("Salary for Renamed Candidate", { exact: true }),
  ).toHaveValue("AUDIT unsaved phone");
});
test("an invalid detached draft stays recoverable and blocks navigation until explicitly discarded", async ({
  page,
  context,
}) => {
  await sample(page);
  const other = await context.newPage();
  await other.goto("/");
  await other.getByRole("button", { name: "Alex Morgan", exact: true }).click();
  await page
    .getByRole("textbox", { name: /^Search.*CPM ID/ })
    .fill("Alex Morgan");
  const draft = "x".repeat(1001);
  await page.getByLabel("Salary for Alex Morgan", { exact: true }).fill(draft);
  await expect(page.getByRole("alert")).toContainText("1000");
  await rename(other);
  const recovery = page.getByRole("region", { name: "Unsaved draft recovery" });
  await expect(recovery).toBeVisible();
  await expect(
    recovery.getByLabel("Recovered draft: Salary for Alex Morgan"),
  ).toHaveValue(draft);
  await expect(
    page.getByText("Unsaved changes", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /^Jobs/ })
    .click();
  await expect(
    page.getByRole("heading", { name: /^Candidates/ }),
  ).toBeVisible();
  await recovery.getByRole("button", { name: "Discard draft" }).click();
  await expect(recovery).toHaveCount(0);
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /^Jobs/ })
    .click();
  await expect(page.getByRole("heading", { name: /^Jobs/ })).toBeVisible();
});

test("normalized saves accept edits queued while the previous write is active", async ({
  page,
}) => {
  await sample(page);
  const field = page.getByLabel("Location for Alex Morgan", { exact: true });
  await field.fill("QA-TRIM");
  // Two real input events around blur, in one task, force the in-flight window.
  await field.evaluate((el) => {
    (el as HTMLInputElement).blur();
    (el as HTMLInputElement).focus();
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(el, "QA-TRIM-2");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await expect(field).toHaveValue("QA-TRIM-2");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByLabel("Location for Alex Morgan", { exact: true }),
  ).toHaveValue("QA-TRIM-2");
});
test("IME Enter leaves the active field focused", async ({ page }) => {
  await sample(page);
  const field = page.getByLabel("Location for Alex Morgan", { exact: true });
  await field.fill("Hà Nội");
  await field.evaluate((el) =>
    el.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        isComposing: true,
        bubbles: true,
      }),
    ),
  );
  await expect(field).toBeFocused();
});

test("a removed detail field can be recovered after closing its modal", async ({
  page,
  context,
}) => {
  await sample(page);
  await page.getByRole("button", { name: "Alex Morgan", exact: true }).click();
  const other = await context.newPage();
  await other.goto("/");
  await other.getByRole("button", { name: "Alex Morgan", exact: true }).click();
  const field = page
    .getByRole("dialog")
    .getByLabel("Notice period", { exact: true });
  await other
    .getByRole("button", { name: "Remove Notice period field", exact: true })
    .click();
  await field.fill("Keep this unsaved notice period");
  await other
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect(field).toHaveCount(0);
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const recovery = page.getByRole("region", { name: "Unsaved draft recovery" });
  await expect(recovery).toBeVisible();
  await expect(
    recovery.getByLabel("Recovered draft: Notice period", { exact: true }),
  ).toHaveValue("Keep this unsaved notice period");
  await expect(
    page.getByText("Unsaved changes", { exact: true }),
  ).toBeVisible();
});
