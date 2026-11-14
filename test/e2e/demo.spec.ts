import { expect, test } from "@playwright/test";
import type { MasonryView } from "../../src/panels/lovelace/views/hui-masonry-view";
import {
  activateDemoSidebarPanel,
  DEMO_THEME_STORAGE_KEY,
  demoCardSelector,
  expectDemoDarkMode,
  expectStoredDemoTheme,
  loadDemo,
  moreInfoCardSelector,
  openDemoSidebar,
  openEnergyDatePicker,
  reloadDemo,
} from "./demo/helpers";
import {
  expectStableColumnWidths,
  firstMasonryFrameCards,
  type MasonryRebuild,
  rebuildMasonryColumns,
  recordFirstMasonryFrame,
  stubMasonryCardSizes,
} from "./demo/masonry";
import {
  expectNoPageErrors,
  NAVIGATION_TIMEOUT,
  PANEL_TIMEOUT,
  QUICK_TIMEOUT,
  SHELL_TIMEOUT,
  trackPageErrors,
} from "./helpers";

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

  test("energy calendar applies a single tapped day", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "A single tap applies only without a hover preview");
    // Touch users can save one day without completing a two-click range.
    const { selector, picker } = await openEnergyDatePicker(page);
    await picker
      .locator("calendar-month")
      .getByRole("button", { name: "November 15", exact: true })
      .click();
    await picker.getByRole("button", { name: "Select", exact: true }).click();
    await expect(picker).toBeHidden();
    await expect(selector.locator(".header-title")).toContainText("15");
    await selector.locator(".date-range").click();
    await expect(picker.locator("calendar-range")).toHaveJSProperty(
      "value",
      "2026-11-15/2026-11-15"
    );
    await picker
      .locator("calendar-month")
      .getByRole("button", { name: "November 10", exact: true })
      .click();
    await picker
      .locator("calendar-month")
      .getByRole("button", { name: "November 18", exact: true })
      .click();
    await picker.getByRole("button", { name: "Select", exact: true }).click();
    await expect(picker).toBeHidden();
    await selector.locator(".date-range").click();
    await expect(picker.locator("calendar-range")).toHaveJSProperty(
      "value",
      "2026-11-10/2026-11-18"
    );
    expectNoPageErrors(pageErrors);
  });

  test("energy calendar requires a completed range with hover", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Hover previews apply to the desktop project");
    // Select must not save old dates while the pointer previews a pending range.
    const { selector, picker } = await openEnergyDatePicker(page);
    const calendar = picker.locator("calendar-month");
    const select = picker.getByRole("button", { name: "Select", exact: true });
    await expect(select).toBeEnabled();
    await calendar
      .getByRole("button", { name: "November 15", exact: true })
      .click();
    await calendar
      .getByRole("button", { name: "November 18", exact: true })
      .hover();
    await expect(select).toBeDisabled();
    await calendar
      .getByRole("button", { name: "November 18", exact: true })
      .click();
    await expect(select).toBeEnabled();
    await select.click();
    await expect(picker).toBeHidden();
    await selector.locator(".date-range").click();
    await expect(picker.locator("calendar-range")).toHaveJSProperty(
      "value",
      "2026-11-15/2026-11-18"
    );
    await calendar
      .getByRole("button", { name: "November 10", exact: true })
      .click();
    await expect(select).toBeDisabled();
    await calendar
      .getByRole("button", { name: "November 10", exact: true })
      .click();
    await expect(select).toBeEnabled();
    await select.click();
    await expect(selector.locator(".header-title")).toContainText("10");
    expectNoPageErrors(pageErrors);
  });

  test("masonry keeps cards connected while a card size is pending", async ({
    page,
  }) => {
    await loadDemo(page, "/?demo=arsaboo#/lovelace/0");
    const view = page.locator("hui-masonry-view");
    await expect
      .poll(() =>
        view.evaluate((element: MasonryView) =>
          element.cards.every((card) => card.isConnected)
        )
      )
      .toBe(true);

    const disconnected = await view.evaluate(async (element: MasonryView) => {
      const card = element.cards[0];
      // Keep the size of the first card pending while the view updates
      card.getCardSize = () =>
        new Promise<number>(() => {
          // never resolves
        });
      card.dispatchEvent(new CustomEvent("card-updated"));
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      return element.cards.filter((c) => !c.isConnected).length;
    });

    expect(disconnected).toBe(0);
    expectNoPageErrors(pageErrors);
  });

  test.describe("masonry placement", () => {
    // These tests set the viewport themselves
    test.skip(({ isMobile }) => isMobile, "Covered by the desktop project");

    for (const [name, rebuild] of [
      ["every column gets cards", { size: 3, stagger: 40 }],
      ["a card size is slow", { size: 3, slow: 1, slowDelay: 2000 }],
      [
        "placing restarts",
        { size: 3, slow: 1, slowDelay: 2000, restart: true },
      ],
    ] as [string, MasonryRebuild][]) {
      test(`masonry columns keep their width when ${name}`, async ({
        page,
      }) => {
        // Placing takes several frames. A column that shows a card must have
        // its final width in every frame, so the cards don't move.
        const { frames } = await rebuildMasonryColumns(page, rebuild);
        expectStableColumnWidths(frames);
        if (rebuild.slow !== undefined) {
          // The cards before the slow one are shown without waiting for it
          expect(frames.some((frame) => frame.placed === rebuild.slow)).toBe(
            true
          );
        }
        expectNoPageErrors(pageErrors);
      });
    }

    test("masonry requests card sizes in parallel", async ({ page }) => {
      // Slow card sizes must not add up: every size is requested before
      // the first one is known.
      const delay = 200;
      const { requests } = await rebuildMasonryColumns(page, {
        size: 3,
        delay,
      });
      expect(Math.max(...requests) - Math.min(...requests)).toBeLessThan(delay);
      expectNoPageErrors(pageErrors);
    });

    test("masonry shows the first card on its own when card sizes are slow", async ({
      page,
    }) => {
      // With every card size equally slow, the sizes are known at about the
      // same time. The first card must still be rendered before more cards
      // are added, so rendering them does not delay it.
      await page.setViewportSize({ width: 1280, height: 900 });
      await stubMasonryCardSizes(page, 300);
      await recordFirstMasonryFrame(page);
      await loadDemo(page, "/?demo=arsaboo#/lovelace/0");
      expect(await firstMasonryFrameCards(page)).toBe(1);
      expectNoPageErrors(pageErrors);
    });

    test("masonry adds cards with known sizes without waiting for a frame", async ({
      page,
    }) => {
      // Sizes known right away are placed as before: waiting for a frame
      // after the first card would let other pending work delay the next
      // ones. The clock is fixed, so the 16 ms budget does not end the first
      // frame either.
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.clock.setFixedTime(new Date("2026-11-20T12:00:00Z"));
      await stubMasonryCardSizes(page);
      await recordFirstMasonryFrame(page);
      await loadDemo(page, "/?demo=arsaboo#/lovelace/0");
      expect(await firstMasonryFrameCards(page)).toBeGreaterThan(1);
      expectNoPageErrors(pageErrors);
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

  test("Bluetooth panel renders its mocked live data", async ({ page }) => {
    // The connectivity mocks reach the panel through two mechanisms the rest of
    // the demo suite never exercises: they are registered lazily, on the first
    // WS command the config panel sends, and their subscriptions emit the first
    // message from a timeout so it lands after `createCollection` has reset its
    // store. If either breaks, the panel still renders but stays empty.
    await loadDemo(page, "/#/config/bluetooth");

    const dashboard = page.locator("bluetooth-config-dashboard");
    await expect(dashboard).toBeAttached({ timeout: PANEL_TIMEOUT });

    // Adapters come from the config entries, connections and advertisements
    // from the subscriptions. A count of zero means the data never arrived.
    const rows = dashboard.locator("ha-list-item-button div[slot='headline']");
    await expect(rows).toHaveCount(3, { timeout: PANEL_TIMEOUT });
    // Asserted over the list as a whole so a single empty count still fails.
    await expect(dashboard.locator("ha-list-nav")).not.toHaveText(/\b0\b/, {
      timeout: QUICK_TIMEOUT,
    });

    // The adapter page is the one that reads the scanner details subscription.
    // Only a local adapter gets a settings button; the two proxies are known to
    // be remote from their scanner type, so without those details all three
    // would render one.
    await loadDemo(page, "/#/config/bluetooth/adapter-info");

    const adapters = page.locator(
      "bluetooth-adapter-info-page ha-list-item-button"
    );
    await expect(adapters).toHaveCount(3, { timeout: PANEL_TIMEOUT });
    await expect(adapters.locator("ha-icon-button")).toHaveCount(1, {
      timeout: QUICK_TIMEOUT,
    });

    expectNoPageErrors(pageErrors);
  });

  test("Matter panel renders its mocked topology", async ({ page }) => {
    // Same lazily registered mocks and deferred subscription delivery as the
    // Bluetooth test above, reached through the topology this time.
    await loadDemo(page, "/#/config/matter");

    const dashboard = page.locator("matter-config-dashboard");
    await expect(dashboard).toBeAttached({ timeout: PANEL_TIMEOUT });
    // Only filled in once the topology reports a node that is both a Matter
    // device and unavailable, so it covers the fetch reaching the panel.
    await expect(dashboard.locator("small.offline")).not.toBeEmpty({
      timeout: PANEL_TIMEOUT,
    });
    // The device and entity counts come from the registries; a zero means the
    // fixtures did not reach them.
    await expect(dashboard.locator("ha-list-nav").first()).not.toHaveText(
      /\b0\b/,
      { timeout: QUICK_TIMEOUT }
    );

    // The map reads the topology over a subscription rather than a fetch.
    await loadDemo(page, "/#/config/matter/visualization");

    const graph = page.locator("matter-network-visualization ha-network-graph");
    await expect(graph).toBeAttached({ timeout: PANEL_TIMEOUT });
    await expect
      .poll(
        () =>
          graph.evaluate(
            (element) =>
              (element as HTMLElement & { data?: { nodes?: unknown[] } }).data
                ?.nodes?.length ?? 0
          ),
        { timeout: PANEL_TIMEOUT }
      )
      .toBeGreaterThan(0);

    // Diagnostics are per device: the Wi-Fi plug and the offline sensor must
    // not report the Thread router's node. Read over the connection, because
    // the device page only renders a subset of them.
    const diagnostics = await page.evaluate(async () => {
      const demo = document.querySelector("ha-demo") as HTMLElement & {
        hass: { connection: { sendMessagePromise: (msg: unknown) => any } };
      };
      const read = (device_id: string) =>
        demo.hass.connection
          .sendMessagePromise({ type: "matter/node_diagnostics", device_id })
          .then(
            (result: { network_type: string; available: boolean }) =>
              `${result.network_type}:${result.available}`,
            () => "rejected"
          );
      return {
        thread: await read("matter-kitchen-light"),
        wifi: await read("matter-office-plug"),
        offline: await read("matter-patio-sensor"),
        unknown: await read("not-a-matter-device"),
      };
    });
    expect(diagnostics).toEqual({
      thread: "thread:true",
      wifi: "wifi:true",
      offline: "thread:false",
      unknown: "rejected",
    });

    expectNoPageErrors(pageErrors);
  });

  for (const colorScheme of ["light", "dark"] as const) {
    test(`unset theme remains light with ${colorScheme} system color scheme`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await page.addInitScript((storageKey) => {
        localStorage.removeItem(storageKey);
        localStorage.removeItem("selectedTheme");
      }, DEMO_THEME_STORAGE_KEY);

      await loadDemo(page);
      await expectDemoDarkMode(page, false);

      expectNoPageErrors(pageErrors);
    });
  }

  test("theme selection persists without offering migration", async ({
    page,
  }) => {
    await page.addInitScript((storageKey) => {
      if (sessionStorage.getItem("theme_test_seeded")) {
        return;
      }
      sessionStorage.setItem("theme_test_seeded", "true");
      localStorage.removeItem(storageKey);
      localStorage.setItem(
        "selectedTheme",
        JSON.stringify({ theme: "default", dark: false })
      );
    }, DEMO_THEME_STORAGE_KEY);

    await loadDemo(page, "/#/profile/dashboard");

    const themeRow = page.locator("ha-pick-theme-row");
    await expect(themeRow).toBeVisible({ timeout: PANEL_TIMEOUT });
    await expect(themeRow.locator(":scope > ha-settings-row")).toHaveCount(0);

    await themeRow.locator('ha-radio-option[value="dark"]').click();

    await expectStoredDemoTheme(page, { theme: "default", dark: true });
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("selectedTheme")), {
        timeout: SHELL_TIMEOUT,
      })
      .toBeNull();
    await expectDemoDarkMode(page, true);

    await reloadDemo(page);
    await expectStoredDemoTheme(page, { theme: "default", dark: true });
    await expectDemoDarkMode(page, true);

    await loadDemo(page, "/#/profile/dashboard");
    await expect(themeRow).toBeVisible({ timeout: PANEL_TIMEOUT });
    await expect(
      themeRow.locator('ha-radio-option[value="dark"]')
    ).toHaveAttribute("aria-checked", "true");

    expectNoPageErrors(pageErrors);
  });
});
