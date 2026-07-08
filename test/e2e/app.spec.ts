/**
 * E2E tests for the HA test app (port 8095).
 *
 * Run with:
 *   yarn test:e2e:app
 */
import { test, expect, type Page } from "@playwright/test";
import type { MoreInfoView } from "../../src/dialogs/more-info/const";
import { PANEL_TIMEOUT, QUICK_TIMEOUT, SHELL_TIMEOUT } from "./helpers";
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

const URL_NORMALIZATION_ASSERTIONS: {
  name: string;
  path: string;
  element: string;
  url: RegExp;
  action?: (page: Page) => Promise<void>;
}[] = [
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

interface E2ELovelaceRoot extends HTMLElement {
  lovelace?: {
    setEditMode: (editMode: boolean) => void;
  };
}

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
    await historyLink.click();

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

// ---------------------------------------------------------------------------
// Panel navigation
// ---------------------------------------------------------------------------

test.describe("Panel navigation", () => {
  for (const [path, element] of e2ePanelRouteAssertions) {
    test(`renders registered panel ${path}`, async ({ page }) => {
      await goToPanel(page, path);
      await expect(page.locator(element).first()).toBeAttached({
        timeout: PANEL_TIMEOUT,
      });
    });
  }
});

test.describe("Panel URL normalization", () => {
  for (const {
    name,
    path,
    element,
    url,
    action,
  } of URL_NORMALIZATION_ASSERTIONS) {
    test(name, async ({ page }) => {
      await goToPanel(page, path);
      await action?.(page);
      await expect(page).toHaveURL(url, { timeout: SHELL_TIMEOUT });
      await expect(page.locator(element).first()).toBeAttached({
        timeout: PANEL_TIMEOUT,
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Tools panel (formerly Developer tools)
// ---------------------------------------------------------------------------

/**
 * Every tool sub-page reachable under /config/tools, mapped to the custom
 * element tools-router mounts for it (see tools-router.ts). Asserting on the
 * specific element proves the route actually rendered its tool, not just the
 * shared ha-panel-tools shell.
 */
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

test.describe("Tools panel", () => {
  test("base path renders the tools panel", async ({ page }) => {
    await goToPanel(page, "/config/tools");
    await expect(page.locator("ha-panel-tools")).toBeAttached({
      timeout: PANEL_TIMEOUT,
    });
  });

  for (const { route, element } of TOOLS_SUBPAGES) {
    test(`renders the ${route} sub-page`, async ({ page }) => {
      await goToPanel(page, `/config/tools/${route}`);
      await expect(page.locator(element)).toBeAttached({
        timeout: PANEL_TIMEOUT,
      });
    });
  }

  test("service is an alias for the action tool", async ({ page }) => {
    await goToPanel(page, "/config/tools/service");
    await expect(page.locator("tools-action")).toBeAttached({
      timeout: PANEL_TIMEOUT,
    });
  });
});

// ---------------------------------------------------------------------------
// Tools redirects (old developer-tools URLs)
// ---------------------------------------------------------------------------

test.describe("Tools redirects", () => {
  // The panel moved from top-level /developer-tools (pre-2026.2) to
  // /config/developer-tools (2026.2), then was renamed to /config/tools
  // (2026.8). Both old locations must redirect to the new one, and deep links
  // must keep their sub-page. See the updateRoute() redirect in
  // src/layouts/home-assistant.ts.
  for (const oldBase of ["/developer-tools", "/config/developer-tools"]) {
    test(`redirects ${oldBase} to the tools panel`, async ({ page }) => {
      await goToPanel(page, oldBase);
      await expect(page.locator("ha-panel-tools")).toBeAttached({
        timeout: PANEL_TIMEOUT,
      });
    });

    test(`redirects ${oldBase}/state to the state tool`, async ({ page }) => {
      await goToPanel(page, `${oldBase}/state`);
      await expect(page.locator("tools-state")).toBeAttached({
        timeout: PANEL_TIMEOUT,
      });
    });
  }
});

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

  const CONFIG_ROUTES: { path: string; element: string }[] = [
    { path: "/config/integrations", element: "ha-config-integrations" },
    { path: "/config/devices", element: "ha-config-devices" },
    { path: "/config/entities", element: "ha-config-entities" },
    { path: "/config/helpers", element: "ha-config-helpers" },
    { path: "/config/areas", element: "ha-config-areas" },
    { path: "/config/apps", element: "ha-config-apps" },
    { path: "/config/app", element: "ha-config-app-dashboard" },
    { path: "/config/automation", element: "ha-config-automation" },
    { path: "/config/backup", element: "ha-config-backup" },
    { path: "/config/scene", element: "ha-config-scene" },
    { path: "/config/script", element: "ha-config-script" },
    { path: "/config/blueprint", element: "ha-config-blueprint" },
    { path: "/config/cloud", element: "ha-config-cloud" },
    { path: "/config/energy", element: "ha-config-energy" },
    { path: "/config/hardware", element: "ha-config-hardware" },
    { path: "/config/labs", element: "ha-config-labs" },
    { path: "/config/lovelace", element: "ha-config-lovelace" },
    { path: "/config/person", element: "ha-config-person" },
    { path: "/config/storage", element: "ha-config-section-storage" },
    { path: "/config/tags", element: "ha-config-tags" },
    { path: "/config/users", element: "ha-config-users" },
    { path: "/config/voice-assistants", element: "ha-config-voice-assistants" },
    { path: "/config/system", element: "ha-config-system-navigation" },
    { path: "/config/info", element: "ha-config-info" },
    { path: "/config/logs", element: "ha-config-logs" },
    { path: "/config/general", element: "ha-config-section-general" },
    { path: "/config/updates", element: "ha-config-section-updates" },
    { path: "/config/repairs", element: "ha-config-repairs-dashboard" },
    { path: "/config/analytics", element: "ha-config-section-analytics" },
    { path: "/config/ai-tasks", element: "ha-config-section-ai-tasks" },
    { path: "/config/labels", element: "ha-config-labels" },
    { path: "/config/zone", element: "ha-config-zone" },
    { path: "/config/network", element: "ha-config-section-network" },
    {
      path: "/config/application_credentials",
      element: "ha-config-application-credentials",
    },
    { path: "/config/bluetooth", element: "bluetooth-config-dashboard-router" },
    { path: "/config/dhcp", element: "dhcp-config-panel" },
    { path: "/config/infrared", element: "infrared-config-dashboard-router" },
    { path: "/config/matter", element: "matter-config-panel" },
    { path: "/config/mqtt", element: "mqtt-config-panel" },
    {
      path: "/config/radio-frequency",
      element: "radio-frequency-config-dashboard-router",
    },
    { path: "/config/ssdp", element: "ssdp-config-panel" },
    { path: "/config/thread", element: "thread-config-panel" },
    { path: "/config/zeroconf", element: "zeroconf-config-panel" },
    { path: "/config/zha", element: "zha-config-dashboard-router" },
    { path: "/config/zwave_js", element: "zwave_js-config-router" },
  ];

  const NESTED_CONFIG_ROUTES: { path: string; element: string }[] = [
    {
      path: "/config/integrations/dashboard",
      element: "ha-config-integrations-dashboard",
    },
    {
      path: "/config/devices/dashboard",
      element: "ha-config-devices-dashboard",
    },
    { path: "/config/areas/dashboard", element: "ha-config-areas-dashboard" },
    { path: "/config/backup/settings", element: "ha-config-backup-settings" },
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

  for (const { path, element } of CONFIG_ROUTES) {
    test(`renders ${path}`, async ({ page }) => {
      await goToPanel(page, path);
      await expect(page.locator(element)).toBeAttached({
        timeout: PANEL_TIMEOUT,
      });
    });
  }

  for (const { path, element } of NESTED_CONFIG_ROUTES) {
    test(`renders ${path}`, async ({ page }) => {
      await goToPanel(page, path);
      await expect(page.locator(element)).toBeAttached({
        timeout: PANEL_TIMEOUT,
      });
    });
  }
});
