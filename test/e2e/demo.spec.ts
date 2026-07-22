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
  activateDemoSidebarPanel,
  demoCardSelector,
  expectDemoDarkMode,
  expectStoredDemoTheme,
  loadDemo,
  moreInfoCardSelector,
  openDemoSidebar,
  reloadDemo,
} from "./demo/helpers";

test.describe("Home Assistant Demo", () => {
  let pageErrors: ReturnType<typeof trackPageErrors>;

  test.beforeEach(async ({ page }) => {
    pageErrors = trackPageErrors(page);
  });

  test("page loads and ha-demo mounts without JS errors", async ({ page }) => {
    await loadDemo(page);

    expectNoPageErrors(pageErrors);
  });

  test("dashboard renders Lovelace cards", async ({ page }) => {
    await loadDemo(page);

    await expect(page.locator(demoCardSelector).first()).toBeVisible({
      timeout: PANEL_TIMEOUT,
    });
  });

  test("sidebar navigation changes the active panel", async ({ page }) => {
    await loadDemo(page);
    await openDemoSidebar(page);
    await activateDemoSidebarPanel(page, "map");

    expectNoPageErrors(pageErrors);
  });

  test("clicking an entity card opens the more-info dialog", async ({
    page,
  }) => {
    await loadDemo(page);

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

  for (const colorScheme of ["light", "dark"] as const) {
    test(`unset theme remains light with ${colorScheme} system color scheme`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await page.addInitScript(() => {
        localStorage.removeItem("demo_theme");
        localStorage.removeItem("selectedTheme");
      });

      await loadDemo(page);
      await expectDemoDarkMode(page, false);

      expectNoPageErrors(pageErrors);
    });
  }

  test("theme selection persists without offering migration", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem("theme_test_seeded")) {
        return;
      }
      sessionStorage.setItem("theme_test_seeded", "true");
      localStorage.removeItem("demo_theme");
      localStorage.setItem(
        "selectedTheme",
        JSON.stringify({ theme: "default", dark: false })
      );
    });

    await loadDemo(page, "/#/profile/general");

    const themeRow = page.locator("ha-pick-theme-row");
    await expect(themeRow).toBeVisible({ timeout: PANEL_TIMEOUT });
    await expect(
      themeRow.getByRole("button", { name: "Migrate", exact: true })
    ).toHaveCount(0);

    await themeRow.locator('ha-radio-option[value="dark"]').click();

    await expectStoredDemoTheme(page, { theme: "default", dark: true });
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("selectedTheme")))
      .toBeNull();
    await expectDemoDarkMode(page, true);

    await reloadDemo(page);
    await expectStoredDemoTheme(page, { theme: "default", dark: true });
    await expectDemoDarkMode(page, true);

    await loadDemo(page, "/#/profile/general");
    await expect(themeRow).toBeVisible({ timeout: PANEL_TIMEOUT });
    await expect(
      themeRow.locator('ha-radio-option[value="dark"]')
    ).toHaveAttribute("aria-checked", "true");

    expectNoPageErrors(pageErrors);
  });
});
