import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

// BrowserStack mobile platforms only allow a single browser context per
// session.  Using serial mode + a shared page (created once in beforeAll)
// avoids Playwright spinning up a new context for each test.
test.describe.configure({ mode: "serial" });

// Dynamic JS imports can fail to load over the BrowserStack tunnel on certain
// mobile/browser combos. These are infrastructure errors, not app bugs.
const DYNAMIC_IMPORT_ERROR =
  /error loading dynamically imported module|Importing a module script failed/i;

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

  /** Returns only errors that are genuine app bugs (not infra tunnel errors). */
  function appErrors() {
    return pageErrors.filter((err) => !DYNAMIC_IMPORT_ERROR.test(err.message));
  }

  /** True when a dynamic-import network error was recorded. */
  function hasDynamicImportError() {
    return pageErrors.some((err) => DYNAMIC_IMPORT_ERROR.test(err.message));
  }

  // ── 1. Page loads ──────────────────────────────────────────────────────────

  test("page loads and ha-demo mounts without JS errors", async () => {
    const page = sharedPage;
    // The custom element is present in the document
    await expect(page.locator("ha-demo")).toBeAttached({ timeout: 30_000 });

    // The launch screen should disappear once the app is ready
    await expect(page.locator("#ha-launch-screen")).toBeHidden({
      timeout: 30_000,
    });

    // No unhandled JS exceptions (excluding infra tunnel errors)
    expect(appErrors()).toHaveLength(0);
  });

  // ── 2. Dashboard renders ───────────────────────────────────────────────────

  test("dashboard renders Lovelace cards", async () => {
    const page = sharedPage;
    // Wait for the app shell to be ready
    await expect(page.locator("ha-demo")).toBeAttached({ timeout: 30_000 });
    await expect(page.locator("#ha-launch-screen")).toBeHidden({
      timeout: 30_000,
    });

    // On some BrowserStack mobile sessions, dynamically imported JS chunks
    // may fail to load over the tunnel (infrastructure flakiness). When that
    // happens, the demo config never loads and no cards render — but the app
    // shell itself is healthy.  Skip the cards assertion in that case.
    //
    // Additionally, BrowserStack's iOS WebKit driver may throw "Internal error"
    // for complex CSS selectors in waitFor(). Use page.evaluate polling as a
    // more compatible alternative.
    try {
      // Poll via evaluate — avoids WebKit driver issues with waitForSelector.
      // Uses recursive shadow DOM traversal since hui-* elements are nested
      // inside shadow roots and document.querySelector() won't find them.
      // Note: avoid passing array arguments to page.evaluate on BrowserStack
      // iOS — serialize as a comma-separated selector string instead.
      const viewOrCardSelector = [
        "hui-masonry-view",
        "hui-sections-view",
        "hui-panel-view",
        "hui-sidebar-view",
        "hui-tile-card",
        "hui-entity-card",
        "hui-glance-card",
        "hui-button-card",
        "hui-markdown-card",
      ].join(",");
      await expect
        .poll(
          async () =>
            page.evaluate((selector) => {
              // Recursively search shadow roots for any matching element.
              // document.querySelector() does not pierce shadow DOM.
              function shadowQuery(root: Document | ShadowRoot): boolean {
                if (root.querySelector(selector)) return true;
                for (const el of root.querySelectorAll("*")) {
                  if (el.shadowRoot && shadowQuery(el.shadowRoot)) return true;
                }
                return false;
              }
              return shadowQuery(document);
            }, viewOrCardSelector),
          { timeout: 30_000, intervals: [500, 1000, 2000] }
        )
        .toBe(true);
    } catch (err) {
      // Give async pageerror events a moment to fire before inspecting them.
      await page.waitForTimeout(1_000);
      if (hasDynamicImportError()) {
        // Infrastructure issue — tunnel couldn't load a JS chunk.
        // The app shell loaded fine; skip the cards check.
        test.skip();
        return;
      }
      throw err;
    }

    // At least one card must be visible — use evaluate to check visibility
    // since Playwright's locator engine may not pierce shadow DOM on all
    // BrowserStack platforms.
    const cardVisible = await page.evaluate((selector) => {
      function shadowVisible(root: Document | ShadowRoot): boolean {
        const el = root.querySelector(selector);
        if (el) {
          const rect = (el as HTMLElement).getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }
        for (const child of root.querySelectorAll("*")) {
          if (child.shadowRoot && shadowVisible(child.shadowRoot)) return true;
        }
        return false;
      }
      return shadowVisible(document);
    }, "hui-tile-card, hui-entity-card, hui-glance-card, hui-button-card, hui-markdown-card");
    expect(cardVisible).toBe(true);
  });

  // ── 3. Sidebar navigation ─────────────────────────────────────────────────

  test("sidebar navigation changes the active panel", async () => {
    const page = sharedPage;
    await expect(page.locator("ha-demo")).toBeAttached({ timeout: 30_000 });
    await expect(page.locator("#ha-launch-screen")).toBeHidden({
      timeout: 30_000,
    });

    // On narrow viewports (< 870 px — mobile / tablet) the sidebar lives
    // inside a modal drawer that is closed by default.  Open it first via
    // the ha-menu-button in the top app-bar.
    const menuButton = page.locator("ha-menu-button");
    if (await menuButton.isVisible()) {
      await menuButton.click();
      // Wait for the drawer animation to complete so sidebar items are visible.
      await page
        .locator("ha-sidebar")
        .waitFor({ state: "visible", timeout: 15_000 });
    } else {
      // On wide viewports the sidebar is always rendered.
      await page
        .locator("ha-sidebar")
        .waitFor({ state: "attached", timeout: 30_000 });
    }

    const candidatePanels = ["map", "logbook", "history", "config"];
    let clicked = false;

    // Wait for at least one panel item to appear before probing visibility.
    await page
      .locator(candidatePanels.map((p) => `#sidebar-panel-${p}`).join(", "))
      .first()
      .waitFor({ state: "visible", timeout: 15_000 });

    for (const panel of candidatePanels) {
      const navItem = page.locator(`#sidebar-panel-${panel}`);
      // eslint-disable-next-line no-await-in-loop
      const visible = await navItem.isVisible();
      if (visible) {
        // eslint-disable-next-line no-await-in-loop
        await navItem.click();
        // eslint-disable-next-line no-await-in-loop
        await expect(page).toHaveURL(new RegExp(`/${panel}`), {
          timeout: 15_000,
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
    await expect(page.locator("ha-demo")).toBeAttached({ timeout: 30_000 });
    await expect(page.locator("#ha-launch-screen")).toBeHidden({
      timeout: 30_000,
    });

    // Tile cards are the most common card type in the demo; they open the
    // more-info dialog on click.  Fall back to other clickable card types in
    // case the demo layout on this platform doesn't include tile cards.
    const clickableCard = page
      .locator(
        "hui-tile-card, hui-entity-card, hui-button-card, hui-glance-card"
      )
      .first();

    try {
      await clickableCard.waitFor({ state: "visible", timeout: 30_000 });
    } catch (err) {
      await page.waitForTimeout(1_000);
      if (hasDynamicImportError()) {
        // Infrastructure issue — no cards rendered due to failed JS chunk load.
        test.skip();
        return;
      }
      throw err;
    }

    await clickableCard.click();

    // The more-info dialog is a top-level custom element appended to the body.
    // We verify it is attached, then confirm it rendered by checking the title
    // span which is slotted into the light DOM and has real layout dimensions.
    const dialog = page.locator("ha-more-info-dialog");
    await expect(dialog).toBeAttached({ timeout: 15_000 });

    // The title is a slotted <span> in the light DOM — visible and has size.
    const title = dialog.locator("span.title");
    await expect(title).toBeVisible({ timeout: 10_000 });

    expect(appErrors()).toHaveLength(0);
  });
});
