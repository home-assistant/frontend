import { expect, test } from "@playwright/test";
import {
  NAVIGATION_TIMEOUT,
  PANEL_TIMEOUT,
  QUICK_TIMEOUT,
  SHELL_TIMEOUT,
  appErrors as filterAppErrors,
} from "./helpers";

test.describe("Home Assistant Demo", () => {
  // Collect JS errors during each test so we can assert no unexpected crashes.
  let pageErrors: Error[] = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err));
    await page.goto("/");
  });

  function appErrors() {
    return filterAppErrors(pageErrors);
  }

  // ── 1. Page loads ──────────────────────────────────────────────────────────

  test("page loads and ha-demo mounts without JS errors", async ({ page }) => {
    // The custom element is present in the document
    await expect(page.locator("ha-demo")).toBeAttached({
      timeout: NAVIGATION_TIMEOUT,
    });

    // The launch screen should disappear once the app is ready
    await expect(page.locator("#ha-launch-screen")).toBeHidden({
      timeout: NAVIGATION_TIMEOUT,
    });

    // No unhandled JS exceptions
    expect(appErrors()).toHaveLength(0);
  });

  // ── 2. Dashboard renders ───────────────────────────────────────────────────

  test("dashboard renders Lovelace cards", async ({ page }) => {
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

    await expect(page.locator(cardSelector).first()).toBeVisible({
      timeout: PANEL_TIMEOUT,
    });
  });

  // ── 3. Sidebar navigation ─────────────────────────────────────────────────

  test("sidebar navigation changes the active panel", async ({ page }) => {
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
      await expect(page.locator("ha-sidebar")).toBeVisible({
        timeout: SHELL_TIMEOUT,
      });
    } else {
      await expect(page.locator("ha-sidebar")).toBeAttached({
        timeout: NAVIGATION_TIMEOUT,
      });
    }

    const candidatePanels = ["map", "logbook", "history", "config"];

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

  test("clicking an entity card opens the more-info dialog", async ({
    page,
  }) => {
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

    await expect(page.locator(cardSelector).first()).toBeVisible({
      timeout: NAVIGATION_TIMEOUT,
    });
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
