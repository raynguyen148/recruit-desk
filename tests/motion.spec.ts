import { test, expect, type Page } from "@playwright/test";
async function nav(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: new RegExp(`^${name}`) })
    .click();
}
async function sample(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore sample workspace", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Alex Morgan", exact: true }),
  ).toBeVisible();
}
async function observeMotion(page: Page) {
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    (window as any).__routeAnimations = [];
    Element.prototype.animate = function (frames, options) {
      const animation = original.call(this, frames, options);
      if (this.classList.contains("page-content"))
        (window as any).__routeAnimations.push(animation);
      return animation;
    };
  });
}
test("navigation motion is bounded and does not replay for filtering or autosave", async ({
  page,
}) => {
  await observeMotion(page);
  await sample(page);
  await nav(page, "Jobs");
  await nav(page, "Candidates");
  const count = await page.evaluate(
    () => (window as any).__routeAnimations.length,
  );
  expect(count).toBe(2);
  await page.getByRole("textbox", { name: /^Search profiles/ }).fill("Alex");
  const field = page.getByLabel("Location for Alex Morgan", { exact: true });
  await field.fill("Motion-safe edit");
  await field.press("Tab");
  await expect(
    page.getByText("All changes saved", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => (window as any).__routeAnimations.length),
  ).toBe(count);
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toHaveCSS("animation-name", "none");
  await nav(page, "Jobs");
  await nav(page, "Companies");
  await nav(page, "Candidates");
  await expect
    .poll(() =>
      page
        .locator(".page-content")
        .evaluate(
          (el) =>
            el.getAnimations().filter((a) => a.playState === "running").length,
        ),
    )
    .toBe(0);
  await expect(
    page.getByLabel("Location for Alex Morgan", { exact: true }),
  ).toHaveValue("Motion-safe edit");
});
test("reduced motion preserves controls and saved feedback without spatial or route animations", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await observeMotion(page);
  await sample(page);
  await nav(page, "Jobs");
  await nav(page, "Candidates");
  expect(
    await page.evaluate(() => (window as any).__routeAnimations.length),
  ).toBe(0);
  await page.getByRole("button", { name: "Alex Morgan", exact: true }).click();
  await expect(page.locator(".sheet-content")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page
    .getByRole("dialog")
    .getByLabel("Headline", { exact: true })
    .fill("Reduced-motion profile");
  await page
    .getByRole("dialog")
    .getByLabel("Headline", { exact: true })
    .press("Tab");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("status", { name: "All changes saved", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add field", exact: true }).click();
  await expect(page.locator(".dialog-content")).toHaveCSS(
    "animation-name",
    "none",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Add field", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Alex Morgan", exact: true }),
  ).toBeFocused();
});
test("mobile save feedback remains accessible and short landscape dialogs stay usable", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await sample(page);
  const status = page.locator(".topbar .save-indicator");
  await expect(status).toHaveAccessibleName("All changes saved");
  await expect(status.locator(".save-state-icon")).toBeVisible();
  await page
    .getByRole("button", { name: "New candidate", exact: true })
    .click();
  await expect(page.locator(".dialog-content")).toHaveCSS(
    "animation-name",
    "dialog-arrive",
  );
  await page
    .getByLabel("Full name", { exact: true })
    .fill("Landscape candidate");
  await page.getByLabel("CPM ID", { exact: true }).fill("LANDSCAPE-1");
  await page.setViewportSize({ width: 568, height: 320 });
  await page
    .getByRole("button", { name: "Create candidate", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Landscape candidate", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await context.close();
});
