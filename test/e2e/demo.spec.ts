import { expect, test } from "@playwright/test";
import {
  expectNoPageErrors,
  NAVIGATION_TIMEOUT,
  PANEL_TIMEOUT,
  QUICK_TIMEOUT,
  SHELL_TIMEOUT,
  trackPageErrors,
} from "./helpers";
import {
  clickFirstVisibleDemoSidebarPanel,
  demoCardSelector,
  moreInfoCardSelector,
  openDemoSidebar,
  waitForDemoReady,
} from "./demo/helpers";

test.describe("Home Assistant Demo", () => {
  let pageErrors: ReturnType<typeof trackPageErrors>;

  test.beforeEach(async ({ page }) => {
    pageErrors = trackPageErrors(page);
    await page.goto("/");
  });

  test("page loads and ha-demo mounts without JS errors", async ({ page }) => {
    await waitForDemoReady(page);

    expectNoPageErrors(pageErrors);
  });

  test("dashboard renders Lovelace cards", async ({ page }) => {
    await waitForDemoReady(page);

    await expect(page.locator(demoCardSelector).first()).toBeVisible({
      timeout: PANEL_TIMEOUT,
    });
  });

  test("sidebar navigation changes the active panel", async ({ page }) => {
    await waitForDemoReady(page);
    await openDemoSidebar(page);

    const clicked = await clickFirstVisibleDemoSidebarPanel(page, [
      "map",
      "logbook",
      "history",
      "config",
    ]);

    expect(clicked, "No known sidebar panel was found to click").toBe(true);
    expectNoPageErrors(pageErrors);
  });

  test("clicking an entity card opens the more-info dialog", async ({
    page,
  }) => {
    await waitForDemoReady(page);

    // Tile cards are the most common card type in the demo; fall back to other
    // clickable card types in case this platform renders a different layout.
    await expect(page.locator(moreInfoCardSelector).first()).toBeVisible({
      timeout: NAVIGATION_TIMEOUT,
    });
    await page.locator(moreInfoCardSelector).first().click();

    const dialog = page.locator("ha-more-info-dialog");
    await expect(dialog).toBeAttached({ timeout: SHELL_TIMEOUT });
    await expect(dialog.locator("span.title")).toBeVisible({
      timeout: QUICK_TIMEOUT,
    });

    expectNoPageErrors(pageErrors);
  });
});
