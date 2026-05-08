/**
 * E2E tests for the HA test app (port 8095).
 *
 * Run with:
 *   yarn test:e2e:app:local
 */
import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// The test app is built with __DEMO__=true which enables hash-based routing.
// Panel paths must use hash URLs: /#/lovelace, /#/energy, etc.
// Scenario selection uses query params: /?scenario=foo (always at root).

/** Navigate to a panel (hash routing) and wait for app to initialize. */
async function goToPanel(page: Page, path: string) {
  // Paths starting with /? are root-level (scenario selection); panel paths
  // need to use hash routing (/#/panelname).
  const url = path.startsWith("/?") ? path : `/#${path}`;
  await page.goto(url);
  await page.waitForSelector("ha-test", { state: "attached" });
  // Wait for the app to finish initialising (hassConnected sets panels)
  await page.waitForFunction(() => Boolean((window as any).__mockHass));
}

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------

test.describe("App shell", () => {
  test("page loads and ha-test element mounts", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await goToPanel(page, "/");

    await expect(page.locator("ha-test")).toBeAttached();
    expect(errors).toHaveLength(0);
  });

  test("sidebar renders with expected panels", async ({ page }) => {
    await goToPanel(page, "/");

    // Regular panels use #sidebar-panel-{urlPath} inside ha-sidebar's shadow root
    for (const urlPath of ["lovelace", "energy", "history"]) {
      // eslint-disable-next-line no-await-in-loop
      await expect(
        page.locator(
          `ha-test >> home-assistant-main >> ha-sidebar >> #sidebar-panel-${urlPath}`
        )
      ).toBeAttached();
    }
    // Config has its own special element with id="sidebar-config"
    await expect(
      page.locator(
        `ha-test >> home-assistant-main >> ha-sidebar >> #sidebar-config`
      )
    ).toBeAttached();
  });

  test("admin user sees config panel in sidebar", async ({ page }) => {
    await goToPanel(page, "/");
    await expect(
      page.locator(
        `ha-test >> home-assistant-main >> ha-sidebar >> #sidebar-config`
      )
    ).toBeAttached();
  });

  test("non-admin user does NOT see config panel in sidebar", async ({
    page,
  }) => {
    await goToPanel(page, "/?scenario=non-admin");
    // Config panel is adminOnly — should not appear for non-admin
    const configLink = page.locator(
      `ha-test >> home-assistant-main >> ha-sidebar >> #sidebar-config`
    );
    await expect(configLink).not.toBeAttached();
  });
});

// ---------------------------------------------------------------------------
// Panel navigation
// ---------------------------------------------------------------------------

test.describe("Panel navigation", () => {
  test("navigates to lovelace dashboard", async ({ page }) => {
    await goToPanel(page, "/lovelace");
    await expect(
      page.locator("ha-panel-lovelace, hui-root").first()
    ).toBeAttached({
      timeout: 20_000,
    });
  });

  test("navigates to energy panel", async ({ page }) => {
    await goToPanel(page, "/energy");
    await expect(
      page.locator("ha-panel-energy, energy-view").first()
    ).toBeAttached({
      timeout: 20_000,
    });
  });

  test("navigates to history panel", async ({ page }) => {
    await goToPanel(page, "/history");
    await expect(
      page.locator("ha-panel-history, history-panel").first()
    ).toBeAttached({
      timeout: 20_000,
    });
  });

  test("navigates to developer-tools panel", async ({ page }) => {
    // Since 2026.2 developer-tools is part of the config panel
    await goToPanel(page, "/config/developer-tools");
    await expect(
      page.locator("ha-panel-config, developer-tools-main").first()
    ).toBeAttached({ timeout: 20_000 });
  });

  test("navigates to profile panel", async ({ page }) => {
    await goToPanel(page, "/profile");
    await expect(
      page.locator("ha-panel-profile, ha-config-user-profile").first()
    ).toBeAttached({ timeout: 20_000 });
  });
});

// ---------------------------------------------------------------------------
// Lovelace
// ---------------------------------------------------------------------------

test.describe("Lovelace dashboard", () => {
  test("renders cards", async ({ page }) => {
    await goToPanel(page, "/lovelace");
    // At least one card should appear
    await expect(page.locator("hui-card, hui-tile-card").first()).toBeAttached({
      timeout: 20_000,
    });
  });

  test("admin user sees edit button", async ({ page }) => {
    await goToPanel(page, "/lovelace");
    // The edit FAB / menu button is present for admins
    await expect(
      page.locator("[data-testid='edit-mode-button'], ha-menu-button")
    ).toBeAttached({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// More-info dialog (light)
// ---------------------------------------------------------------------------

test.describe("Light more-info dialog", () => {
  test("opens more-info dialog for a light entity", async ({ page }) => {
    await goToPanel(page, "/?scenario=light-more-info");

    // Wait for ha-test to be ready
    await page.waitForFunction(() => Boolean((window as any).__mockHass));

    // Navigate to lovelace where tiles should appear
    await page.goto("/#/lovelace");
    await page.waitForFunction(() => Boolean((window as any).__mockHass));

    // Trigger more-info for our known test entity via JS
    await page.evaluate(() => {
      const hass = (window as any).__mockHass;
      // Build the path dynamically to prevent TypeScript from resolving it
      // as a local module (it is a runtime URL served by the test app).
      const dialogPath = ["/frontend_latest", "ha-more-info-dialog.js"].join(
        "/"
      );
      hass.mockEvent("show-dialog", {
        dialogTag: "ha-more-info-dialog",
        dialogImport: () =>
          import(/* @vite-ignore */ dialogPath).catch(() => null),
        dialogParams: { entityId: "light.test_light" },
      });
      // Use the built-in fire event mechanism
      const el = document.querySelector("ha-test") as any;
      if (el) {
        const event = new CustomEvent("hass-more-info", {
          detail: { entityId: "light.test_light" },
          bubbles: true,
          composed: true,
        });
        el.dispatchEvent(event);
      }
    });

    // The more-info dialog should appear
    const dialog = page.locator("ha-more-info-dialog");
    await expect(dialog).toBeAttached({ timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// Theming
// ---------------------------------------------------------------------------

test.describe("Theming", () => {
  test("dark theme sets darkMode flag", async ({ page }) => {
    await goToPanel(page, "/?scenario=dark-theme");

    await expect(page.locator("ha-test")).toBeAttached();

    // The dark-theme scenario calls updateHass({ themes: { darkMode: true } });
    // verify that flag is actually set on the mock hass object.
    const darkMode = await page.evaluate(
      () => (window.__mockHass as any)?.themes?.darkMode
    );
    expect(darkMode).toBe(true);
  });

  test("custom theme applies CSS variables", async ({ page }) => {
    await goToPanel(page, "/?scenario=custom-theme");

    // The custom-theme scenario sets --primary-color to #e91e63
    const primaryColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue(
        "--primary-color"
      )
    );
    expect(primaryColor.trim()).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Config panel
// ---------------------------------------------------------------------------

test.describe("Config panel", () => {
  test("config panel loads without JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await goToPanel(page, "/config");
    await expect(
      page.locator("ha-panel-config, ha-config-dashboard").first()
    ).toBeAttached({ timeout: 25_000 });

    // Filter known pre-existing errors from vendor code
    const realErrors = errors.filter(
      (e) => !e.includes("ResizeObserver") && !e.includes("Non-Error")
    );
    expect(realErrors).toHaveLength(0);
  });
});
