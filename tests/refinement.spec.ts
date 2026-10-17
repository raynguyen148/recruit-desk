import { test, expect, type Page } from "@playwright/test";

async function sample(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore sample workspace", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Alex Morgan", exact: true }),
  ).toBeVisible();
}

test("hidden filters remain discoverable and removable, and clearing search keeps focus", async ({
  page,
}) => {
  await sample(page);
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.getByRole("combobox", { name: "Location filter" }).click();
  await page.getByRole("option", { name: "Singapore", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page
    .getByRole("button", { name: "Remove location filter: Singapore" })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(8);
  const search = page.getByRole("textbox", { name: /^Search profiles/ });
  await search.fill("Alex");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(search).toBeFocused();
  await expect(page.locator("tbody tr")).toHaveCount(8);
});

test("wide tables scroll by keyboard and retain the identity column", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await sample(page);
  const region = page.getByRole("region", {
    name: "Candidates, scroll for more columns",
  });
  await expect(
    page.getByText("Scroll horizontally for more details"),
  ).toBeVisible();
  await region.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => region.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(35);
  // The row-number column scrolls away first; identity then pins to the viewport edge.
  const viewportLeft = await region.evaluate(
    (el) => el.getBoundingClientRect().left,
  );
  await expect
    .poll(async () => {
      const pinnedLeft = await page
        .locator("tbody .sticky-name")
        .first()
        .evaluate((el) => el.getBoundingClientRect().left);
      return Math.abs(pinnedLeft - viewportLeft);
    })
    .toBeLessThan(2);
  await expect(region).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("settings links preserve route and returning to a list starts at its heading", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await sample(page);
  await page
    .getByRole("button", { name: "Settings & data", exact: true })
    .click();
  await page.getByRole("link", { name: "Local storage", exact: true }).click();
  await expect(page.locator("#local-storage")).toBeInViewport();
  await expect(page).toHaveURL(/#settings$/);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: /^Candidates/ })
    .click();
  await expect(
    page.getByRole("heading", { name: /^Candidates/ }),
  ).toBeInViewport();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
});
