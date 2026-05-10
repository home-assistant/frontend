import { expect, test } from "@playwright/test";

test.describe("Home Assistant Demo", () => {
  // Collect JS errors during each test so we can assert no unexpected crashes.
  let pageErrors: Error[] = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err));
    await page.goto("/");
  });

  // ── 1. Page loads ──────────────────────────────────────────────────────────

  test("page loads and ha-demo mounts without JS errors", async ({ page }) => {
    // The custom element is present in the document
    await expect(page.locator("ha-demo")).toBeAttached({ timeout: 30_000 });

    // The launch screen should disappear once the app is ready
    await expect(page.locator("#ha-launch-screen")).toBeHidden({
      timeout: 30_000,
    });

    // No unhandled JS exceptions
    expect(pageErrors).toHaveLength(0);
  });

  // ── 2. Dashboard renders ───────────────────────────────────────────────────

  test("dashboard renders Lovelace cards", async ({ page }) => {
    // Wait for the app shell to be ready
    await expect(page.locator("ha-demo")).toBeAttached({ timeout: 30_000 });
    await expect(page.locator("#ha-launch-screen")).toBeHidden({
      timeout: 30_000,
    });

    // Lovelace cards are rendered inside the shadow DOM.
    // Playwright pierces shadow roots with CSS selectors automatically.
    // We wait for at least one hui-* card element to appear.
    const card = page.locator("[class*='hui-']").first();
    // Alternatively match by the lovelace view container:
    const lovelaceView = page
      .locator(
        "hui-masonry-view, hui-sections-view, hui-panel-view, hui-sidebar-view"
      )
      .first();

    // One of the two approaches should succeed — wait for whichever is present
    await Promise.race([
      lovelaceView.waitFor({ state: "attached", timeout: 30_000 }),
      card.waitFor({ state: "attached", timeout: 30_000 }),
    ]);

    // At least one card must be visible
    const cards = page.locator(
      "hui-tile-card, hui-entity-card, hui-glance-card, hui-button-card, hui-markdown-card"
    );
    await expect(cards.first()).toBeVisible({ timeout: 30_000 });
  });

  // ── 3. Sidebar navigation ─────────────────────────────────────────────────

  test("sidebar navigation changes the active panel", async ({ page }) => {
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
    }

    // The sidebar uses ha-list-item-button elements with id="sidebar-panel-{url}"
    // Pick "map" as a reliable, always-present demo panel.  Fall back to
    // "logbook" or "history" if map isn't available.
    // Wait for the sidebar itself to render before probing for panels.
    await page
      .locator("ha-sidebar")
      .waitFor({ state: "attached", timeout: 30_000 });

    const candidatePanels = ["map", "logbook", "history", "config"];
    let clicked = false;

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
    expect(pageErrors).toHaveLength(0);
  });

  // ── 4. More info dialog ───────────────────────────────────────────────────

  test("clicking an entity card opens the more-info dialog", async ({
    page,
  }) => {
    await expect(page.locator("ha-demo")).toBeAttached({ timeout: 30_000 });
    await expect(page.locator("#ha-launch-screen")).toBeHidden({
      timeout: 30_000,
    });

    // Navigate to the default dashboard (root) in case a previous test
    // already navigated away.
    await page.goto("/");
    await expect(page.locator("#ha-launch-screen")).toBeHidden({
      timeout: 30_000,
    });

    // Tile cards are the most common card type in the demo configs; they are
    // clickable and open the more-info dialog.
    const tileCard = page.locator("hui-tile-card").first();
    await tileCard.waitFor({ state: "visible", timeout: 30_000 });
    await tileCard.click();

    // The more-info dialog is a top-level custom element appended to the body.
    // We verify it is attached, then confirm it rendered by checking the title
    // span which is slotted into the light DOM and has real layout dimensions.
    const dialog = page.locator("ha-more-info-dialog");
    await expect(dialog).toBeAttached({ timeout: 15_000 });

    // The title is a slotted <span> in the light DOM — visible and has size.
    const title = dialog.locator("span.title");
    await expect(title).toBeVisible({ timeout: 10_000 });

    expect(pageErrors).toHaveLength(0);
  });
});
