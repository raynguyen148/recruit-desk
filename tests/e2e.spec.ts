import { test, expect, type Page } from "@playwright/test";

async function open(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /^Candidates/ }),
  ).toBeVisible();
}
async function navigate(page: Page, label: string) {
  if (label === "Settings & data")
    await page.getByRole("button", { name: label, exact: true }).click();
  else
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: new RegExp(`^${label}`) })
      .click();
}
async function closeDetails(page: Page) {
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
async function createCandidate(page: Page, name = "Ada Test", cpm = "QA-100") {
  await navigate(page, "Candidates");
  await page
    .getByRole("button", { name: "New candidate", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name", { exact: true }).fill(name);
  await dialog.getByLabel("CPM ID", { exact: true }).fill(cpm);
  await dialog
    .getByRole("button", { name: "Create candidate", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name, exact: true }),
  ).toBeVisible();
  await closeDetails(page);
}
async function choose(page: Page, label: string, name: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name, exact: true }).click();
}

test("starts empty and adds fictional data only after opt-in", async ({
  page,
}) => {
  await open(page);
  await expect(
    page.getByRole("heading", { name: "Build your talent network" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Alex Morgan", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Explore sample workspace", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Alex Morgan", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("CPM ID for Alex Morgan")).toHaveValue(
    "DEMO-1001",
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Alex Morgan", exact: true }),
  ).toBeVisible();
});

test("candidate creation, CPM uniqueness, autosave persistence, cross-tab updates and deletion", async ({
  page,
  context,
}) => {
  await open(page);
  await createCandidate(page);
  await page
    .getByLabel("Location for Ada Test", { exact: true })
    .fill("Da Nang");
  await page.getByLabel("Location for Ada Test", { exact: true }).press("Tab");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Location for Ada Test", { exact: true }),
  ).toHaveValue("Da Nang");
  const other = await context.newPage();
  await open(other);
  await other
    .getByLabel("Phone for Ada Test", { exact: true })
    .fill("+84 900 123 456");
  await other.getByLabel("Phone for Ada Test", { exact: true }).press("Tab");
  await expect(
    page.getByLabel("Phone for Ada Test", { exact: true }),
  ).toHaveValue("+84 900 123 456");
  await other.close();
  await page
    .getByRole("button", { name: "New candidate", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name", { exact: true }).fill("Duplicate Ada");
  await dialog.getByLabel("CPM ID", { exact: true }).fill(" qa-100 ");
  await dialog
    .getByRole("button", { name: "Create candidate", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("already exists");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Ada Test", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Full name", { exact: true })
    .fill("Ada Updated");
  await closeDetails(page);
  await expect(
    page.getByRole("button", { name: "Ada Updated", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ada Updated", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete permanently" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Build your talent network" }),
  ).toBeVisible();
});

test("company, job, and application relationships persist with stage history", async ({
  page,
}) => {
  await open(page);
  await createCandidate(page);
  await navigate(page, "Companies");
  await page.getByRole("button", { name: "New company", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Company name", { exact: true })
    .fill("QA Studio");
  await page
    .getByRole("button", { name: "Create company", exact: true })
    .click();
  await closeDetails(page);
  await navigate(page, "Jobs");
  await page.getByRole("button", { name: "New job", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Job title", { exact: true })
    .fill("QA Engineer");
  await choose(page, "Company", "QA Studio");
  await page.getByRole("button", { name: "Create job", exact: true }).click();
  await closeDetails(page);
  await expect(
    page.getByRole("cell", { name: "QA Studio", exact: true }),
  ).toBeVisible();
  await navigate(page, "Applications");
  await page
    .getByRole("button", { name: "New application", exact: true })
    .click();
  await choose(page, "Candidate", "Ada Test · QA-100");
  await choose(page, "Job", "QA Engineer");
  await page
    .getByRole("button", { name: "Create application", exact: true })
    .click();
  await closeDetails(page);
  await choose(page, "Stage for Ada Test for QA Engineer", "Interview");
  await page
    .getByLabel("Next action for Ada Test for QA Engineer", { exact: true })
    .fill("Book technical interview");
  await page
    .getByLabel("Next action for Ada Test for QA Engineer", { exact: true })
    .press("Tab");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Stage for Ada Test for QA Engineer" }),
  ).toContainText("Interview");
  await expect(
    page.getByLabel("Next action for Ada Test for QA Engineer"),
  ).toHaveValue("Book technical interview");
  await page.getByRole("button", { name: "Ada Test", exact: true }).click();
  await expect(
    page.getByText("Moved from Sourced", { exact: true }),
  ).toBeVisible();
  await closeDetails(page);
  await navigate(page, "Companies");
  await page.getByRole("button", { name: "QA Studio", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete permanently" })
    .click();
  await expect(
    page.getByText(
      "Move or delete this company’s jobs before deleting the company.",
      { exact: true },
    ),
  ).toBeVisible();
  await closeDetails(page);
  await navigate(page, "Candidates");
  await page.getByRole("button", { name: "Ada Test", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete permanently" })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await navigate(page, "Applications");
  await expect(
    page.getByRole("heading", { name: "Make the first connection" }),
  ).toBeVisible();
});

test("vendor CSV requires preview and rejects malformed and duplicate rows", async ({
  page,
}) => {
  await open(page);
  await page
    .getByRole("button", { name: "Import vendor CSV", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Import file")
    .setInputFiles({
      name: "invalid.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("Wrong,Columns\nA,B"),
    });
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Import records" }),
  ).toBeDisabled();
  await dialog
    .getByLabel("Import file")
    .setInputFiles({
      name: "duplicate.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("Issue key,Summary\nCPM-1,Ada\ncpm-1,Grace"),
    });
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Import records" }),
  ).toBeDisabled();
  await dialog
    .getByLabel("Import file")
    .setInputFiles({
      name: "valid.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        'Issue key,Summary,Skill Set,Vendor note\nCPM-20,"Morgan, Alex","React,Node.js","Quoted, source"',
      ),
    });
  await expect(
    dialog.getByText("File validated. No changes have been saved yet.", {
      exact: true,
    }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Import records" }).click();
  await expect(
    page.getByRole("button", { name: "Morgan, Alex", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Morgan, Alex", exact: true }).click();
  await page.getByRole("tab", { name: "Source", exact: true }).click();
  await expect(page.getByText("Quoted, source", { exact: true })).toBeVisible();
});

test("full backup restores into another isolated browser context", async ({
  page,
  browser,
}, testInfo) => {
  await open(page);
  await createCandidate(page, "Backup Candidate", "BACKUP-1");
  await navigate(page, "Settings & data");
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download full backup", exact: true })
    .click();
  const download = await downloading;
  const path = testInfo.outputPath("workspace-backup.json");
  await download.saveAs(path);
  const restoredContext = await browser.newContext();
  try {
    const restored = await restoredContext.newPage();
    await restored.goto(new URL("/", page.url()).href);
    await expect(
      restored.getByRole("heading", { name: "Build your talent network" }),
    ).toBeVisible();
    await navigate(restored, "Settings & data");
    await restored
      .getByRole("button", { name: "Restore workspace JSON", exact: true })
      .click();
    const dialog = restored.getByRole("dialog");
    await dialog.getByLabel("Import file").setInputFiles(path);
    await expect(
      dialog.getByText("File validated. No changes have been saved yet.", {
        exact: true,
      }),
    ).toBeVisible();
    if (await dialog.getByRole("checkbox").count())
      await dialog.getByRole("checkbox").check();
    await dialog
      .getByRole("button", { name: "Restore workspace", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await navigate(restored, "Candidates");
    await expect(
      restored.getByRole("button", { name: "Backup Candidate", exact: true }),
    ).toBeVisible();
    await restored.reload();
    await expect(
      restored.getByLabel("CPM ID for Backup Candidate"),
    ).toHaveValue("BACKUP-1");
  } finally {
    await restoredContext.close();
  }
});

test("works offline after initial cache and makes no external requests", async ({
  page,
  context,
  baseURL,
}) => {
  const external: string[] = [];
  context.on("request", (request) => {
    const url = request.url();
    if (
      /^https?:/.test(url) &&
      new URL(url).origin !== new URL(baseURL!).origin
    )
      external.push(url);
  });
  await open(page);
  await createCandidate(page, "Offline Candidate", "OFFLINE-1");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Offline Candidate", exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Offline Candidate", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Location for Offline Candidate", { exact: true })
    .fill("Offline edit");
  await page
    .getByLabel("Location for Offline Candidate", { exact: true })
    .press("Tab");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Location for Offline Candidate", { exact: true }),
  ).toHaveValue("Offline edit");
  expect(external).toEqual([]);
});

test("same-field conflicts retain the losing draft and block navigation until resolved", async ({
  page,
  context,
}) => {
  await open(page);
  await createCandidate(page);
  const other = await context.newPage();
  await open(other);
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page
    .getByLabel("Location for Ada Test", { exact: true })
    .fill("Losing draft");
  await other
    .getByLabel("Location for Ada Test", { exact: true })
    .fill("Winning location");
  await other.getByLabel("Location for Ada Test", { exact: true }).press("Tab");
  await expect(
    other.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  await page.clock.runFor(100);
  await page.getByLabel("Location for Ada Test", { exact: true }).press("Tab");
  await expect(page.getByRole("alert")).toContainText("changed in another tab");
  await expect(
    page.getByLabel("Location for Ada Test", { exact: true }),
  ).toHaveValue("Losing draft");
  await navigate(page, "Jobs");
  await expect(
    page.getByRole("heading", { name: /^Candidates/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Use saved value", exact: true })
    .click();
  await expect(
    page.getByLabel("Location for Ada Test", { exact: true }),
  ).toHaveValue("Winning location");
  await navigate(page, "Jobs");
  await expect(page.getByRole("heading", { name: /^Jobs/ })).toBeVisible();
});

test("invalid required detail drafts block tabs and closing until restored", async ({
  page,
}) => {
  await open(page);
  await createCandidate(page);
  await page.getByRole("button", { name: "Ada Test", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Full name", { exact: true }).fill("");
  await dialog.getByRole("tab", { name: /^Applications/ }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Candidate name is required",
  );
  await expect(
    dialog.getByRole("tab", { name: "Profile", exact: true }),
  ).toHaveAttribute("data-state", "active");
  await dialog.getByRole("button", { name: "Close details" }).click();
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Use saved value", exact: true })
    .click();
  await expect(dialog.getByLabel("Full name", { exact: true })).toHaveValue(
    "Ada Test",
  );
  await dialog.getByRole("tab", { name: /^Applications/ }).click();
  await expect(
    dialog.getByRole("tab", { name: /^Applications/ }),
  ).toHaveAttribute("data-state", "active");
  await closeDetails(page);
});

test("captures desktop, dark, mobile, and detail views without console errors or page overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await open(page);
  await page
    .getByRole("button", { name: "Explore sample workspace", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Alex Morgan", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Fictional sample workspace added", { exact: true }),
  ).toBeHidden();
  await page.screenshot({
    path: "../../work/qa/candidates-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /^Theme:/ }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "../../work/qa/candidates-dark.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: /^Theme:/ }).click();
  await navigate(page, "Jobs");
  await page
    .getByRole("button", { name: "Senior Frontend Engineer", exact: true })
    .click();
  await page.screenshot({
    path: "../../work/qa/job-detail-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await closeDetails(page);
  await navigate(page, "Applications");
  await page.getByRole("button", { name: "Alex Morgan", exact: true }).click();
  await page.screenshot({
    path: "../../work/qa/application-detail-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await closeDetails(page);
  await navigate(page, "Candidates");
  await page.setViewportSize({ width: 390, height: 844 });
  console.log(
    "Mobile sidebar evidence",
    await page.locator(".sidebar").evaluate((el) => {
      const s = getComputedStyle(el),
        r = el.getBoundingClientRect();
      return {
        display: s.display,
        position: s.position,
        visibility: s.visibility,
        top: r.top,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
        viewport: innerHeight,
      };
    }),
  );
  await page.screenshot({
    path: "../../work/qa/candidates-mobile.png",
    fullPage: false,
    animations: "disabled",
  });
  await navigate(page, "Jobs");
  await expect(page.getByRole("heading", { name: /^Jobs/ })).toBeVisible();
  await navigate(page, "Candidates");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
