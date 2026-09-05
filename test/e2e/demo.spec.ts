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
  DEMO_THEME_STORAGE_KEY,
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
    const rows = dashboard.locator("ha-md-list-item div[slot='headline']");
    await expect(rows).toHaveCount(3, { timeout: PANEL_TIMEOUT });
    // Asserted over the list as a whole so a single empty count still fails.
    await expect(dashboard.locator("ha-md-list")).not.toHaveText(/\b0\b/, {
      timeout: QUICK_TIMEOUT,
    });

    // The adapter page is the one that reads the scanner details subscription.
    // Only a local adapter gets a settings button; the two proxies are known to
    // be remote from their scanner type, so without those details all three
    // would render one.
    await loadDemo(page, "/#/config/bluetooth/adapter-info");

    const adapters = page.locator(
      "bluetooth-adapter-info-page ha-md-list-item"
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
    await expect(dashboard.locator("ha-md-list").first()).not.toHaveText(
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

  test("ZHA device page reaches the Zigbee panels", async ({ page }) => {
    // Both the info card and the device actions look up the device's `zigbee`
    // connection and render nothing without it, so an empty card here means
    // the fixtures only registered the `zha` identifier.
    await loadDemo(page, "/#/config/devices/device/zha-porch-light");

    const info = page.locator("ha-device-info-zha");
    await expect(info).toBeAttached({ timeout: PANEL_TIMEOUT });
    // The panel is only rendered once the device lookup returns.
    await expect(info.locator("ha-expansion-panel")).toBeAttached({
      timeout: PANEL_TIMEOUT,
    });

    // The manage page is reached from those actions and asks for the device's
    // clusters; without them it renders its empty state instead of a cluster.
    await loadDemo(
      page,
      "/#/config/zha/device/84:2e:14:ff:fe:11:22:33/clusters"
    );

    const clusters = page.locator("zha-manage-clusters");
    await expect(clusters).toBeAttached({ timeout: PANEL_TIMEOUT });
    await expect(clusters.locator("zha-cluster-attributes")).toBeAttached({
      timeout: PANEL_TIMEOUT,
    });

    // Group binding offers only the client side of a device, so a mock with
    // nothing but `in` clusters leaves its bind button permanently disabled.
    // The switch is the device that binds, so it is the one that must have
    // them.
    const outClusters = await page.evaluate(() => {
      const demo = document.querySelector("ha-demo") as HTMLElement & {
        hass: { connection: { sendMessagePromise: (msg: unknown) => any } };
      };
      return demo.hass.connection
        .sendMessagePromise({
          type: "zha/devices/clusters",
          ieee: "84:2e:14:ff:fe:aa:bb:01",
        })
        .then((result: { name: string; type: string }[]) =>
          result
            .filter((cluster) => cluster.type === "out")
            .map((cluster) => cluster.name)
            .sort()
        );
    });
    expect(outClusters).toEqual(["Identify", "LevelControl", "OnOff"]);

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
