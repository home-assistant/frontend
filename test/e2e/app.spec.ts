/**
 * E2E tests for the HA test app (port 8095).
 *
 * Run with:
 *   yarn test:e2e:app
 */
import { test, expect, type Page } from "@playwright/test";
import type { MoreInfoView } from "../../src/dialogs/more-info/const";
import {
  defineRouteSmokeTests,
  goToPanel,
  PANEL_TIMEOUT,
  QUICK_TIMEOUT,
  rendersRoute,
  routeCase,
  routeCases,
  SHELL_TIMEOUT,
  type RouteSmokeCase,
  type RouteSmokeGroup,
} from "./helpers";
import { e2ePanelRouteAssertions } from "./app/src/ha-test-panels";

/**
 * Each More info view renders one root element inside the dialog, plus one or
 * more characteristic descendants that prove the view actually populated rather
 * than rendering an empty shell. `text`, when set, asserts the element's text
 * instead of just its presence.
 */
const MORE_INFO_VIEW_ELEMENTS: {
  view: MoreInfoView;
  element: string;
  content: { selector: string; text?: string }[];
}[] = [
  {
    view: "info",
    element: "ha-more-info-info",
    content: [
      { selector: "more-info-light" },
      { selector: "span.title", text: "Test Light" },
    ],
  },
  {
    view: "history",
    element: "ha-more-info-history-and-logbook",
    // The demo loads the history component but not logbook.
    content: [{ selector: "ha-more-info-history" }],
  },
  {
    view: "settings",
    element: "ha-more-info-settings",
    // The scenario mocks config/entity_registry/get, so the real registry
    // panel renders instead of the "no unique ID" warning.
    content: [{ selector: "entity-registry-settings" }],
  },
  {
    view: "related",
    element: "ha-related-items",
    // search/related is mocked to return no relations, so the empty list
    // renders.
    content: [{ selector: "ha-related-items >> ha-list" }],
  },
  {
    view: "add_to",
    element: "ha-more-info-add-to",
    // Admin users get the default add-to action list.
    content: [{ selector: "ha-add-to-action-list" }],
  },
  {
    view: "details",
    element: "ha-more-info-details",
    // The details view renders the state and attributes cards.
    content: [{ selector: "ha-card" }],
  },
];

interface E2ELovelaceRoot extends HTMLElement {
  lovelace?: {
    setEditMode: (editMode: boolean) => void;
  };
}

async function setLovelaceEditMode(page: Page, editMode: boolean) {
  await page
    .locator("hui-root")
    .first()
    .waitFor({ state: "attached", timeout: QUICK_TIMEOUT });
  await page
    .locator("hui-root")
    .first()
    .evaluate(async (el: Element, value) => {
      const root = el as E2ELovelaceRoot;
      const start = performance.now();
      await new Promise<void>((resolve, reject) => {
        const check = () => {
          if (root.lovelace?.setEditMode) {
            resolve();
            return;
          }
          if (performance.now() - start > 2000) {
            reject(new Error("Lovelace edit mode action was not available"));
            return;
          }
          requestAnimationFrame(check);
        };
        check();
      });
      root.lovelace!.setEditMode(value);
    }, editMode);
}

const PANEL_ROUTE_ASSERTIONS: RouteSmokeCase[] = Array.from(
  e2ePanelRouteAssertions,
  ([path, element]) => routeCase(path, element)
);

const URL_NORMALIZATION_ASSERTIONS: RouteSmokeCase[] = [
  {
    name: "keeps the todo panel when adding the selected entity query",
    path: "/todo",
    element: "ha-panel-todo",
    url: /\/\?entity_id=todo\.shopping_list#\/todo$/,
  },
  {
    name: "keeps the history panel when removing the back query",
    path: "/?back=1#/history",
    element: "ha-panel-history, history-panel",
    url: /\/#\/history$/,
  },
  {
    name: "keeps the logbook panel when removing the back query",
    path: "/?back=1#/logbook",
    element: "ha-panel-logbook",
    url: /\/#\/logbook$/,
  },
  {
    name: "keeps the lovelace panel when adding the edit query",
    path: "/lovelace",
    element: "ha-panel-lovelace, hui-root",
    url: /\/\?edit=1#\/lovelace\/home$/,
    action: (page) => setLovelaceEditMode(page, true),
  },
  {
    name: "keeps the lovelace panel when removing the edit query",
    path: "/lovelace",
    element: "ha-panel-lovelace, hui-root",
    url: /\/#\/lovelace\/home$/,
    action: async (page) => {
      await setLovelaceEditMode(page, true);
      await expect(page).toHaveURL(/\/\?edit=1#\/lovelace\/home$/, {
        timeout: SHELL_TIMEOUT,
      });
      await setLovelaceEditMode(page, false);
    },
  },
];

const TOOLS_SUBPAGES: { route: string; element: string }[] = [
  { route: "yaml", element: "tools-yaml-config" },
  { route: "state", element: "tools-state" },
  { route: "action", element: "tools-action" },
  { route: "template", element: "tools-template" },
  { route: "event", element: "tools-event" },
  { route: "statistics", element: "tools-statistics" },
  { route: "assist", element: "tools-assist" },
  { route: "debug", element: "tools-debug" },
];

const TOOLS_ROUTE_ASSERTIONS: RouteSmokeCase[] = [
  routeCase("/config/tools", "ha-panel-tools"),
  ...TOOLS_SUBPAGES.map(({ route, element }) =>
    routeCase(`/config/tools/${route}`, element)
  ),
  routeCase("/config/tools/service", "tools-action"),
];

const TOOLS_REDIRECT_ASSERTIONS: RouteSmokeCase[] = [
  ...["/developer-tools", "/config/developer-tools"].flatMap((oldBase) => [
    routeCase(oldBase, "ha-panel-tools"),
    routeCase(`${oldBase}/state`, "tools-state"),
  ]),
];

const CONFIG_ROUTES = routeCases([
  ["/config/integrations", "ha-config-integrations"],
  ["/config/devices", "ha-config-devices"],
  ["/config/entities", "ha-config-entities"],
  ["/config/helpers", "ha-config-helpers"],
  ["/config/areas", "ha-config-areas"],
  ["/config/apps", "ha-config-apps"],
  ["/config/app", "ha-config-app-dashboard"],
  ["/config/automation", "ha-config-automation"],
  ["/config/backup", "ha-config-backup"],
  ["/config/scene", "ha-config-scene"],
  ["/config/script", "ha-config-script"],
  ["/config/blueprint", "ha-config-blueprint"],
  ["/config/cloud", "ha-config-cloud"],
  ["/config/energy", "ha-config-energy"],
  ["/config/hardware", "ha-config-hardware"],
  ["/config/labs", "ha-config-labs"],
  ["/config/lovelace", "ha-config-lovelace"],
  ["/config/person", "ha-config-person"],
  ["/config/storage", "ha-config-section-storage"],
  ["/config/tags", "ha-config-tags"],
  ["/config/users", "ha-config-users"],
  ["/config/voice-assistants", "ha-config-voice-assistants"],
  ["/config/system", "ha-config-system-navigation"],
  ["/config/info", "ha-config-info"],
  ["/config/logs", "ha-config-logs"],
  ["/config/general", "ha-config-section-general"],
  ["/config/updates", "ha-config-section-updates"],
  ["/config/repairs", "ha-config-repairs-dashboard"],
  ["/config/analytics", "ha-config-section-analytics"],
  ["/config/ai-tasks", "ha-config-section-ai-tasks"],
  ["/config/labels", "ha-config-labels"],
  ["/config/zone", "ha-config-zone"],
  ["/config/network", "ha-config-section-network"],
  ["/config/application_credentials", "ha-config-application-credentials"],
  ["/config/bluetooth", "bluetooth-config-dashboard-router"],
  ["/config/dhcp", "dhcp-config-panel"],
  ["/config/infrared", "infrared-config-dashboard-router"],
  ["/config/matter", "matter-config-panel"],
  ["/config/mqtt", "mqtt-config-panel"],
  ["/config/radio-frequency", "radio-frequency-config-dashboard-router"],
  ["/config/ssdp", "ssdp-config-panel"],
  ["/config/thread", "thread-config-panel"],
  ["/config/zeroconf", "zeroconf-config-panel"],
  ["/config/zha", "zha-config-dashboard-router"],
  ["/config/zwave_js", "zwave_js-config-router"],
]);

const NESTED_CONFIG_ROUTES = routeCases([
  ["/config/integrations/dashboard", "ha-config-integrations-dashboard"],
  ["/config/devices/dashboard", "ha-config-devices-dashboard"],
  ["/config/areas/dashboard", "ha-config-areas-dashboard"],
  ["/config/backup/settings", "ha-config-backup-settings"],
]);

const ROUTE_SMOKE_GROUPS: RouteSmokeGroup[] = [
  {
    name: "Panel navigation",
    routes: PANEL_ROUTE_ASSERTIONS,
    testName: (route) => `renders registered panel ${route.path}`,
  },
  {
    name: "Panel URL normalization",
    routes: URL_NORMALIZATION_ASSERTIONS,
    testName: (route) => route.name!,
  },
  {
    name: "Tools panel",
    routes: TOOLS_ROUTE_ASSERTIONS,
    testName: rendersRoute,
  },
  {
    name: "Tools redirects",
    routes: TOOLS_REDIRECT_ASSERTIONS,
    testName: (route) => `redirects ${route.path}`,
  },
  {
    name: "Config routes",
    routes: CONFIG_ROUTES,
    testName: rendersRoute,
  },
  {
    name: "Nested config routes",
    routes: NESTED_CONFIG_ROUTES,
    testName: rendersRoute,
  },
];

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
    await goToPanel(page, "/lovelace");

    // Regular panels use #sidebar-panel-{urlPath} inside ha-sidebar's shadow root
    for (const urlPath of ["lovelace", "map", "energy", "history"]) {
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

  test("sidebar navigation changes the active panel", async ({ page }) => {
    await goToPanel(page, "/lovelace");

    const sidebar = page.locator(
      "ha-test >> home-assistant-main >> ha-sidebar"
    );
    await expect(sidebar).toBeAttached({ timeout: SHELL_TIMEOUT });

    const historyLink = sidebar.locator("#sidebar-panel-history");
    if (!(await historyLink.isVisible().catch(() => false))) {
      await page.locator("ha-test >> home-assistant-main").evaluate((el) => {
        el.dispatchEvent(
          new CustomEvent("hass-toggle-menu", {
            detail: { open: true },
            bubbles: true,
            composed: true,
          })
        );
      });
    }

    await expect(historyLink).toBeVisible({ timeout: SHELL_TIMEOUT });
    await historyLink.click({ force: true });

    await expect(page).toHaveURL(/\/#\/history$/, { timeout: SHELL_TIMEOUT });
    await expect(
      page.locator("ha-panel-history, history-panel").first()
    ).toBeAttached({ timeout: PANEL_TIMEOUT });
  });

  test("sidebar renders notification badge", async ({ page }) => {
    await goToPanel(page, "/lovelace");

    const sidebar = page.locator(
      "ha-test >> home-assistant-main >> ha-sidebar"
    );
    await expect(sidebar).toBeAttached({ timeout: SHELL_TIMEOUT });

    const notificationsLink = sidebar.locator("#sidebar-notifications");
    await expect(notificationsLink).toBeAttached({ timeout: SHELL_TIMEOUT });
    await expect(notificationsLink.locator(".badge").first()).toHaveText("1", {
      timeout: SHELL_TIMEOUT,
    });
  });

  test("sidebar marks the active panel as selected", async ({ page }) => {
    const sidebar = page.locator(
      "ha-test >> home-assistant-main >> ha-sidebar"
    );
    const lovelaceLink = sidebar.locator("#sidebar-panel-lovelace");
    const historyLink = sidebar.locator("#sidebar-panel-history");

    await goToPanel(page, "/lovelace");
    await expect(lovelaceLink).toHaveClass(/selected/, {
      timeout: SHELL_TIMEOUT,
    });
    await expect(historyLink).not.toHaveClass(/selected/);

    await goToPanel(page, "/history");
    await expect(historyLink).toHaveClass(/selected/, {
      timeout: SHELL_TIMEOUT,
    });
    await expect(lovelaceLink).not.toHaveClass(/selected/);
  });

  test("non-admin user does NOT see config panel in sidebar", async ({
    page,
  }) => {
    // Navigate to a panel route so the sidebar actually renders, then apply
    // the non-admin scenario via query param.
    await goToPanel(page, "/?scenario=non-admin#/lovelace");

    // Wait for the sidebar to mount before asserting on its contents.
    await expect(
      page.locator("ha-test >> home-assistant-main >> ha-sidebar")
    ).toBeAttached({ timeout: SHELL_TIMEOUT });

    // Config panel is adminOnly — should not appear for non-admin.
    const configLink = page.locator(
      `ha-test >> home-assistant-main >> ha-sidebar >> #sidebar-config`
    );
    await expect(configLink).not.toBeAttached();
  });
});

defineRouteSmokeTests(ROUTE_SMOKE_GROUPS);

// ---------------------------------------------------------------------------
// Lovelace
// ---------------------------------------------------------------------------

test.describe("Lovelace dashboard", () => {
  test("renders cards", async ({ page }) => {
    await goToPanel(page, "/lovelace");
    // At least one card should appear
    await expect(page.locator("hui-card, hui-tile-card").first()).toBeAttached({
      timeout: PANEL_TIMEOUT,
    });
  });

  test("admin user sees edit button", async ({ page }) => {
    await goToPanel(page, "/lovelace");
    // The edit FAB / menu button is present for admins
    await expect(
      page.locator("[data-testid='edit-mode-button'], ha-menu-button")
    ).toBeAttached({ timeout: QUICK_TIMEOUT });
  });
});

// ---------------------------------------------------------------------------
// More-info dialog (light)
// ---------------------------------------------------------------------------

test.describe("Light more-info dialog", () => {
  for (const { view, element, content } of MORE_INFO_VIEW_ELEMENTS) {
    test(`opens more-info ${view} view for a light entity`, async ({
      page,
    }) => {
      // The light-more-info scenario seeds light.test_light synchronously.
      await goToPanel(page, "/?scenario=light-more-info#/lovelace");

      const dialog = page.locator("ha-more-info-dialog");

      // Fire the standard hass-more-info event from the app root with an
      // explicit view. The HA shell opens ha-more-info-dialog on the requested
      // view directly, so the test does not depend on the admin/demo-hidden
      // header controls.
      //
      // The event is one-shot: if it lands before the shell's hass-more-info
      // listener is attached it is silently dropped. Re-dispatching is
      // idempotent (showDialog just resets the dialog to the requested view),
      // so poll the dispatch until the requested view actually renders.
      await expect(async () => {
        await page.evaluate((v) => {
          const el = document.querySelector("ha-test");
          el?.dispatchEvent(
            new CustomEvent("hass-more-info", {
              detail: { entityId: "light.test_light", view: v },
              bubbles: true,
              composed: true,
            })
          );
        }, view);

        await expect(dialog).toBeAttached({ timeout: QUICK_TIMEOUT });
        await expect(dialog.locator(element)).toBeAttached({
          timeout: QUICK_TIMEOUT,
        });
      }).toPass({ timeout: SHELL_TIMEOUT });

      // Each view should render its own characteristic content, not just an
      // empty shell.
      for (const { selector, text } of content) {
        const locator = dialog.locator(selector).first();
        if (text) {
          // eslint-disable-next-line no-await-in-loop
          await expect(locator).toContainText(text, { timeout: QUICK_TIMEOUT });
        } else {
          // eslint-disable-next-line no-await-in-loop
          await expect(locator).toBeAttached({ timeout: QUICK_TIMEOUT });
        }
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Theming
// ---------------------------------------------------------------------------

test.describe("Theming", () => {
  test("dark theme sets darkMode flag", async ({ page }) => {
    await goToPanel(page, "/?scenario=dark-theme#/lovelace");

    // The dark-theme scenario sets selectedTheme.dark = true, which causes
    // _applyTheme() to set themes.darkMode = true on the element.
    await page.waitForFunction(
      () =>
        (document.querySelector("ha-test") as any)?.hass?.themes?.darkMode ===
        true,
      undefined,
      { timeout: QUICK_TIMEOUT }
    );
  });

  test("custom theme applies CSS variables", async ({ page }) => {
    await goToPanel(page, "/?scenario=custom-theme#/lovelace");

    // The custom-theme scenario sets --primary-color to #e91e63. Wait until
    // _applyTheme has propagated the value to <html> before reading it — the
    // scenario fires before hassConnected, but the variable lands on :root in
    // the same tick mockTheme is called.
    await page.waitForFunction(
      () =>
        getComputedStyle(document.documentElement)
          .getPropertyValue("--primary-color")
          .trim() !== "",
      undefined,
      { timeout: QUICK_TIMEOUT }
    );

    const primaryColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--primary-color")
        .trim()
    );
    // Compare normalised — some browsers serialise as rgb().
    expect(primaryColor.toLowerCase()).toMatch(
      /#e91e63|rgb\(233,\s*30,\s*99\)/
    );
  });
});

// ---------------------------------------------------------------------------
// Config panel
// ---------------------------------------------------------------------------

test.describe("Config panel", () => {
  const DASHBOARD_LINKS = [
    { href: "/config/integrations", label: "Devices & services" },
    { href: "/config/automation", label: "Automations & scenes" },
    { href: "/config/areas", label: "Areas, labels & zones" },
    { href: "/config/apps", label: "Apps" },
    { href: "/config/lovelace/dashboards", label: "Dashboards" },
    { href: "/config/voice-assistants", label: "Voice assistants" },
    { href: "/config/matter", label: "Matter" },
    { href: "/config/zha", label: "Zigbee" },
    { href: "/config/zwave_js", label: "Z-Wave" },
    { href: "/knx", label: "KNX" },
    { href: "/config/thread", label: "Thread" },
    { href: "/config/bluetooth", label: "Bluetooth" },
    { href: "/config/infrared", label: "Infrared" },
    { href: "/config/radio-frequency", label: "Radio frequency" },
    { href: "/insteon", label: "Insteon" },
    { href: "/config/tags", label: "Tags" },
    { href: "/config/person", label: "People" },
    { href: "/config/system", label: "System" },
    { href: "/config/tools", label: "Tools" },
    { href: "/config/info", label: "About" },
  ];

  test("config panel loads without JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await goToPanel(page, "/config");
    await expect(
      page.locator("ha-panel-config, ha-config-dashboard").first()
    ).toBeAttached({ timeout: PANEL_TIMEOUT + 5_000 });

    // Filter known pre-existing errors from vendor code
    const realErrors = errors.filter(
      (e) => !e.includes("ResizeObserver") && !e.includes("Non-Error")
    );
    expect(realErrors).toHaveLength(0);
  });

  test("dashboard renders key settings links", async ({ page }) => {
    await goToPanel(page, "/config");

    const dashboard = page.locator("ha-config-dashboard");
    await expect(dashboard).toBeAttached({ timeout: PANEL_TIMEOUT });

    for (const { href, label } of DASHBOARD_LINKS) {
      const link = dashboard.getByRole("link", {
        name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`),
      });
      // eslint-disable-next-line no-await-in-loop
      await expect(link).toHaveAttribute("href", href, {
        timeout: QUICK_TIMEOUT,
      });
    }
  });
});
