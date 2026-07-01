/**
 * E2E tests for the HA test app (port 8095).
 *
 * Run with:
 *   yarn test:e2e:app
 */
import { test, expect, type Page } from "@playwright/test";
import type { MoreInfoView } from "../../src/dialogs/more-info/const";
import { PANEL_TIMEOUT, QUICK_TIMEOUT, SHELL_TIMEOUT } from "./helpers";

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
    await goToPanel(page, "/lovelace");

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
  test("navigates to lovelace dashboard", async ({ page }) => {
    await goToPanel(page, "/lovelace");
    await expect(
      page.locator("ha-panel-lovelace, hui-root").first()
    ).toBeAttached({
      timeout: PANEL_TIMEOUT,
    });
  });

  test("navigates to energy panel", async ({ page }) => {
    await goToPanel(page, "/energy");
    await expect(
      page.locator("ha-panel-energy, energy-view").first()
    ).toBeAttached({
      timeout: PANEL_TIMEOUT,
    });
  });

  test("navigates to history panel", async ({ page }) => {
    await goToPanel(page, "/history");
    await expect(
      page.locator("ha-panel-history, history-panel").first()
    ).toBeAttached({
      timeout: PANEL_TIMEOUT,
    });
  });

  test("navigates to profile panel", async ({ page }) => {
    await goToPanel(page, "/profile");
    await expect(
      page.locator("ha-panel-profile, ha-config-user-profile").first()
    ).toBeAttached({ timeout: PANEL_TIMEOUT });
  });
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
});
