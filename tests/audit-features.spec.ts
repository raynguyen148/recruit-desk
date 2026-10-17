import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixture = JSON.parse(
  readFileSync("samples/recruitdesk-full-sample.json", "utf8"),
);
async function restore(page: Page, data = fixture) {
  await page.goto("/");
  await page.getByRole("button", { name: /^Settings & data/ }).click();
  await page
    .getByRole("button", { name: "Restore workspace JSON", exact: true })
    .click();
  await page.getByLabel("Import file").setInputFiles({
    name: "audit.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await expect(
    page.getByText("File validated. No changes have been saved yet."),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Restore workspace", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function nav(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: new RegExp(`^${name}`) })
    .click();
}
test("imported timestamp follow-up remains editable in application detail", async ({
  page,
}) => {
  const imported = structuredClone(fixture);
  imported.data.applications[0].followUp = "2026-10-20T09:30:00+07:00";
  await restore(page, imported);
  await nav(page, "Applications");
  const row = page
    .locator("tbody tr")
    .filter({ hasText: "An Nguyễn" })
    .filter({ hasText: "Full-stack Engineer" });
  await row.getByRole("button", { name: "An Nguyễn", exact: true }).click();
  const date = page.getByLabel("Follow-up date", { exact: true });
  await expect(date).toHaveValue("2026-10-20");
  await date.fill("2026-10-22");
  await date.press("Tab");
  await expect(
    page.getByRole("dialog").getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  await row.getByRole("button", { name: "An Nguyễn", exact: true }).click();
  await expect(page.getByLabel("Follow-up date", { exact: true })).toHaveValue(
    "2026-10-22",
  );
});
test("profile item deletion requires confirmation and cancellation restores focus", async ({
  page,
}) => {
  await restore(page);
  await nav(page, "Candidates");
  await page.getByRole("button", { name: "An Nguyễn", exact: true }).click();
  const title = fixture.data.candidates[0].entries[0].title;
  const remove = page.getByRole("button", {
    name: `Remove ${title}`,
    exact: true,
  });
  await remove.click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(page.locator(".profile-entry")).toHaveCount(5);
  await expect(remove).toBeFocused();
  await remove.click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect(page.locator(".profile-entry")).toHaveCount(4);
});
test("mobile restore notification does not block bottom navigation", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await restore(page);
  await expect(
    page.getByText("Import complete: 80 added, 1 updated."),
  ).toBeVisible();
  await nav(page, "Candidates");
  await expect(
    page.getByRole("heading", { name: "Candidates 24", exact: true }),
  ).toBeVisible();
  const inline = page.getByLabel("Location for An Nguyễn", { exact: true });
  expect(await inline.evaluate((el) => getComputedStyle(el).fontSize)).toBe(
    "16px",
  );
  expect(
    (await page
      .getByRole("combobox", {
        name: "Status for An Nguyễn",
        exact: true,
      })
      .boundingBox())!.height,
  ).toBeGreaterThanOrEqual(44);
  const toast = page.locator("[data-sonner-toast]").first();
  const navbox = await page.locator(".sidebar").boundingBox();
  const toastbox = await toast.boundingBox();
  if (toastbox && navbox)
    expect(toastbox.y + toastbox.height).toBeLessThanOrEqual(navbox.y);
  await context.close();
});
test("large native JSON requires approval before the file is read", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = File.prototype.text;
    Object.defineProperty(File.prototype, "size", {
      get() {
        return this.name === "large-native.json" ? 101 * 1024 * 1024 : 100;
      },
    });
    (window as any).__fileReads = 0;
    File.prototype.text = function () {
      (window as any).__fileReads++;
      return original.call(this);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /^Settings & data/ }).click();
  await page
    .getByRole("button", { name: "Restore workspace JSON", exact: true })
    .click();
  await page.getByLabel("Import file").setInputFiles({
    name: "large-native.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  await expect(
    page.getByRole("button", { name: "Read large JSON", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).__fileReads)).toBe(0);
  await page
    .getByRole("button", { name: "Read large JSON", exact: true })
    .click();
  await expect(
    page.getByText("File validated. No changes have been saved yet."),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).__fileReads)).toBe(1);
});
