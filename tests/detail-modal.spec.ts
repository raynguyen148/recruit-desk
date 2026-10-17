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

test("all record types open in a wide centered modal and return keyboard focus", async ({
  page,
}, testInfo) => {
  await sample(page);
  for (const name of ["Candidates", "Jobs", "Companies", "Applications"]) {
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("button", { name: new RegExp(`^${name}`) })
      .click();
    const opener = page.locator("tbody .record-link").first();
    await opener.click();
    const modal = page.locator(".detail-modal-content");
    await expect(modal).toBeVisible();
    await expect(modal).toHaveCSS("width", "1080px");
    await expect
      .poll(async () => {
        const bounds = await modal.boundingBox();
        return Math.abs(bounds!.x + bounds!.width / 2 - 720);
      })
      .toBeLessThan(1);
    await expect(
      page.getByRole("button", { name: "Close details" }),
    ).toBeVisible();
    if (name === "Candidates") {
      await page.screenshot({
        path: testInfo.outputPath("candidate-modal-desktop.png"),
        animations: "disabled",
      });
    }
    await page.getByRole("button", { name: "Close details" }).focus();
    await page.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
});

test("detail modal fits touch and landscape viewports while its heading stays available", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
  });
  try {
    const page = await context.newPage();
    await sample(page);
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 375, height: 812 },
      { width: 768, height: 1024 },
      { width: 568, height: 320 },
    ]) {
      await page.setViewportSize(viewport);
      await page
        .getByRole("button", { name: "Alex Morgan", exact: true })
        .click();
      const modal = page.locator(".detail-modal-content");
      await expect(modal).toBeVisible();
      await modal.evaluate(async (element) => {
        await Promise.all(
          element
            .getAnimations()
            .map((animation) => animation.finished.catch(() => {})),
        );
      });
      const bounds = (await modal.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(11);
      expect(bounds.y).toBeGreaterThanOrEqual(11);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width - 11);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(
        viewport.height - 11,
      );
      const heading = page.locator(".detail-modal-heading");
      const before = (await heading.boundingBox())!.y;
      await page.locator(".detail-modal-body").evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      expect((await heading.boundingBox())!.y).toBe(before);
      await expect(
        page.getByRole("button", { name: "Close details" }),
      ).toBeVisible();
      expect(
        await modal.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      if (viewport.width === 375) {
        await page.locator(".detail-modal-body").evaluate((element) => {
          element.scrollTop = 0;
        });
        await page.screenshot({
          path: testInfo.outputPath("candidate-modal-mobile.png"),
          animations: "disabled",
        });
      }
      await page.getByRole("button", { name: "Close details" }).click();
      await expect(modal).toHaveCount(0);
    }
  } finally {
    await context.close();
  }
});
