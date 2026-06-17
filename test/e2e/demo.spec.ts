import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import {
  NAVIGATION_TIMEOUT,
  PANEL_TIMEOUT,
  QUICK_TIMEOUT,
  SHELL_TIMEOUT,
  appErrors as filterAppErrors,
  waitForOrSkip,
} from "./helpers";

// BrowserStack mobile platforms only allow a single browser context per
// session.  Using serial mode + a shared page (created once in beforeAll)
// avoids Playwright spinning up a new context for each test.
test.describe.configure({ mode: "serial" });

test.describe("Home Assistant Demo", () => {
  // Collect JS errors during each test so we can assert no unexpected crashes.
  let pageErrors: Error[] = [];
  let sharedPage: Page;

  test.beforeAll(async ({ browser }) => {
    // BrowserStack mobile pre-creates a single context and page.
    // Re-use them instead of calling browser.newContext() which would trigger
    // "Only one browser context is allowed" on mobile devices.
    const existingContexts = browser.contexts();
    const context =
      existingContexts.length > 0
        ? existingContexts[0]
        : await browser.newContext();

    const existingPages = context.pages();
    sharedPage =
      existingPages.length > 0 ? existingPages[0] : await context.newPage();
  });

  test.afterAll(async () => {
    // Do not close the context — BrowserStack manages it.
    // Just navigate away to a blank page to clean up.
    await sharedPage.goto("about:blank").catch(() => {
      // Ignore errors if the page/session is already gone.
    });
  });

  test.beforeEach(async () => {
    pageErrors = [];
    sharedPage.removeAllListeners("pageerror");
    sharedPage.on("pageerror", (err) => pageErrors.push(err));
    await sharedPage.goto("/");
  });

  function appErrors() {
    return filterAppErrors(pageErrors);
  }

  // ── 1. Page loads ──────────────────────────────────────────────────────────

  test("page loads and ha-demo mounts without JS errors", async () => {
    const page = sharedPage;
    // The custom element is present in the document
    await expect(page.locator("ha-demo")).toBeAttached({
      timeout: NAVIGATION_TIMEOUT,
    });

    // The launch screen should disappear once the app is ready
    await expect(page.locator("#ha-launch-screen")).toBeHidden({
      timeout: NAVIGATION_TIMEOUT,
    });

    // No unhandled JS exceptions (excluding infra tunnel errors)
    expect(appErrors()).toHaveLength(0);
  });

  // ── 2. Dashboard renders ───────────────────────────────────────────────────

  test("dashboard renders Lovelace cards", async () => {
    const page = sharedPage;
    await expect(page.locator("ha-demo")).toBeAttached({
      timeout: NAVIGATION_TIMEOUT,
    });
    await expect(page.locator("#ha-launch-screen")).toBeHidden({
      timeout: NAVIGATION_TIMEOUT,
    });

    const cardSelector = [
      "hui-tile-card",
      "hui-entity-card",
      "hui-glance-card",
      "hui-button-card",
      "hui-markdown-card",
    ].join(", ");

    await waitForOrSkip(
      page,
      cardSelector,
      "attached",
      PANEL_TIMEOUT,
      pageErrors
    );
    await expect(page.locator(cardSelector).first()).toBeVisible({
      timeout: NAVIGATION_TIMEOUT,
    });
  });

  // ── 3. Sidebar navigation ─────────────────────────────────────────────────

  test("sidebar navigation changes the active panel", async () => {
    const page = sharedPage;
    await expect(page.locator("ha-demo")).toBeAttached({
      timeout: NAVIGATION_TIMEOUT,
    });
    await expect(page.locator("#ha-launch-screen")).toBeHidden({
      timeout: NAVIGATION_TIMEOUT,
    });

    // On narrow viewports (< 870 px — mobile / tablet) the sidebar lives
    // inside a modal drawer that is closed by default. Open it first via
    // the ha-menu-button in the top app-bar.
    const menuButton = page.locator("ha-menu-button");
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await waitForOrSkip(
        page,
        "ha-sidebar",
        "visible",
        SHELL_TIMEOUT,
        pageErrors
      );
    } else {
      await waitForOrSkip(
        page,
        "ha-sidebar",
        "attached",
        NAVIGATION_TIMEOUT,
        pageErrors
      );
    }

    const candidatePanels = ["map", "logbook", "history", "config"];
    const panelSelector = candidatePanels
      .map((p) => `#sidebar-panel-${p}`)
      .join(", ");
    await waitForOrSkip(
      page,
      panelSelector,
      "visible",
      SHELL_TIMEOUT,
      pageErrors
    );

    let clicked = false;
    for (const panel of candidatePanels) {
      const navItem = page.locator(`#sidebar-panel-${panel}`);
      // eslint-disable-next-line no-await-in-loop
      const visible = await navItem.isVisible().catch(() => false);
      if (visible) {
        // eslint-disable-next-line no-await-in-loop
        await navItem.click();
        // eslint-disable-next-line no-await-in-loop
        await expect(page).toHaveURL(new RegExp(`/${panel}`), {
          timeout: SHELL_TIMEOUT,
        });
        clicked = true;
        break;
      }
    }

    expect(clicked, "No known sidebar panel was found to click").toBe(true);
    expect(appErrors()).toHaveLength(0);
  });

  // ── 4. More info dialog ───────────────────────────────────────────────────

  test("clicking an entity card opens the more-info dialog", async () => {
    const page = sharedPage;
    await expect(page.locator("ha-demo")).toBeAttached({
      timeout: NAVIGATION_TIMEOUT,
    });
    await expect(page.locator("#ha-launch-screen")).toBeHidden({
      timeout: NAVIGATION_TIMEOUT,
    });

    // Tile cards are the most common card type in the demo; they open the
    // more-info dialog on click. Fall back to other clickable card types in
    // case the demo layout on this platform doesn't include tile cards.
    const cardSelector =
      "hui-tile-card, hui-entity-card, hui-button-card, hui-glance-card";

    await waitForOrSkip(
      page,
      cardSelector,
      "visible",
      NAVIGATION_TIMEOUT,
      pageErrors
    );
    await page.locator(cardSelector).first().click();

    // The more-info dialog is a top-level custom element appended to the body.
    // We verify it is attached, then confirm it rendered by checking the title
    // span which is slotted into the light DOM and has real layout dimensions.
    const dialog = page.locator("ha-more-info-dialog");
    await expect(dialog).toBeAttached({ timeout: SHELL_TIMEOUT });

    const title = dialog.locator("span.title");
    await expect(title).toBeVisible({ timeout: QUICK_TIMEOUT });

    expect(appErrors()).toHaveLength(0);
  });
});
