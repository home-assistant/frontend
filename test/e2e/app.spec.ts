/**
 * E2E tests for the HA test app (port 8095).
 *
 * Run with:
 *   yarn test:e2e:app
 */
import { test, expect } from "@playwright/test";
import {
  appSidebar,
  appSidebarConfig,
  appSidebarPanel,
  assertElementContent,
  defineLinkSmokeTests,
  defineRouteSmokeTests,
  ensureAppSidebarPanelVisible,
  goToPanel,
} from "./app/src/helpers";
import {
  expectNoPageErrors,
  PANEL_TIMEOUT,
  QUICK_TIMEOUT,
  SHELL_TIMEOUT,
  trackPageErrors,
} from "./helpers";
import {
  appRouteSmokeGroups,
  configLinks,
  moreInfoViewElements,
} from "./app/src/smoke";

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------

test.describe("App shell", () => {
  test("page loads and ha-test element mounts", async ({ page }) => {
    const errors = trackPageErrors(page);

    await goToPanel(page, "/");

    await expect(page.locator("ha-test")).toBeAttached({
      timeout: QUICK_TIMEOUT,
    });
    expectNoPageErrors(errors, undefined, []);
  });

  test("sidebar renders with expected panels", async ({ page }) => {
    await goToPanel(page, "/lovelace");

    await Promise.all([
      // Regular panels use #sidebar-panel-{urlPath} inside ha-sidebar's shadow root.
      ...["lovelace", "map", "energy", "history"].map((urlPath) =>
        expect(appSidebarPanel(page, urlPath)).toBeAttached({
          timeout: QUICK_TIMEOUT,
        })
      ),
      // Config has its own special element with id="sidebar-config".
      expect(appSidebarConfig(page)).toBeAttached({
        timeout: QUICK_TIMEOUT,
      }),
    ]);
  });

  test("sidebar navigation changes the active panel", async ({ page }) => {
    await goToPanel(page, "/lovelace");

    const historyLink = await ensureAppSidebarPanelVisible(page, "history");
    await historyLink.click();

    await expect(page).toHaveURL(/\/#\/history$/, { timeout: QUICK_TIMEOUT });
    await expect(
      page.locator("ha-panel-history, history-panel").first()
    ).toBeAttached({ timeout: PANEL_TIMEOUT });
  });

  test("sidebar renders notification badge", async ({ page }) => {
    await goToPanel(page, "/lovelace");

    const sidebar = appSidebar(page);
    await expect(sidebar).toBeAttached({ timeout: QUICK_TIMEOUT });

    const notificationsLink = sidebar.locator("#sidebar-notifications");
    await expect(notificationsLink).toBeAttached({ timeout: QUICK_TIMEOUT });
    await expect(notificationsLink.locator(".badge").first()).toHaveText("1", {
      timeout: QUICK_TIMEOUT,
    });
  });

  test("sidebar marks the active panel as selected", async ({ page }) => {
    const lovelaceLink = appSidebarPanel(page, "lovelace");
    const historyLink = appSidebarPanel(page, "history");

    await goToPanel(page, "/lovelace");
    await expect(lovelaceLink).toHaveClass(/selected/, {
      timeout: QUICK_TIMEOUT,
    });
    await expect(historyLink).not.toHaveClass(/selected/);

    await goToPanel(page, "/history");
    await expect(historyLink).toHaveClass(/selected/, {
      timeout: QUICK_TIMEOUT,
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
    await expect(appSidebar(page)).toBeAttached({ timeout: QUICK_TIMEOUT });

    // Config panel is adminOnly — should not appear for non-admin.
    await expect(appSidebarConfig(page)).not.toBeAttached({
      timeout: QUICK_TIMEOUT,
    });
  });
});

test.describe("Quick search", () => {
  test("starts an Assist conversation with the search query", async ({
    page,
  }) => {
    await goToPanel(page, "/?scenario=quick-search-assist#/lovelace");

    await page.keyboard.press("Control+K");

    const quickBar = page.locator("ha-quick-bar");
    await expect(quickBar).toBeAttached({ timeout: QUICK_TIMEOUT });
    await quickBar
      .locator("ha-input-search >> input")
      .fill("Turn on the lights");

    const assistItem = quickBar
      .locator(".combo-box-row")
      .filter({ hasText: "Ask Assist: Turn on the lights" });
    await expect(assistItem).toBeVisible({ timeout: QUICK_TIMEOUT });
    await assistItem.click();

    const voiceCommandDialog = page.locator("ha-voice-command-dialog");
    await expect(voiceCommandDialog).toBeAttached({ timeout: QUICK_TIMEOUT });
    await expect(voiceCommandDialog.locator("ha-assist-chat")).toBeAttached({
      timeout: QUICK_TIMEOUT,
    });

    await expect
      .poll(() => page.evaluate(() => window.__assistRun))
      .toMatchObject({
        type: "assist_pipeline/run",
        start_stage: "intent",
        input: { text: "Turn on the lights" },
        end_stage: "intent",
        pipeline: "test-pipeline",
        conversation_id: null,
      });
  });
});

defineRouteSmokeTests(appRouteSmokeGroups);

test("keeps the launch screen until initial panel content renders", async ({
  page,
}) => {
  const cases: {
    name: string;
    path: string;
    loadingSelector: string;
    readySelector: string;
    resolvers: (
      | "rejectMediaBrowse"
      | "resolveCalendarRegistry"
      | "resolveConfigEntries"
      | "resolveConfigEntriesInProgress"
      | "resolveGeneratedDashboard"
      | "resolveLovelaceConfig"
      | "resolveMediaBrowse"
    )[];
  }[] = [
    {
      name: "calendar",
      path: "/?scenario=delayed-calendar#/calendar",
      loadingSelector: "ha-panel-calendar ha-spinner",
      readySelector: "ha-full-calendar",
      resolvers: ["resolveCalendarRegistry"],
    },
    {
      name: "media browser",
      path: "/?scenario=delayed-media-browse#/media-browser/browser",
      loadingSelector: "ha-media-player-browse > ha-spinner",
      readySelector: "ha-media-player-browse .no-items",
      resolvers: ["resolveMediaBrowse"],
    },
    {
      name: "integrations",
      path: "/?scenario=delayed-integrations#/config/integrations",
      loadingSelector: "ha-config-integrations-dashboard hass-loading-screen",
      readySelector: "ha-config-integrations-dashboard hass-tabs-subpage",
      resolvers: ["resolveConfigEntries", "resolveConfigEntriesInProgress"],
    },
    {
      name: "media browser error",
      path: "/?scenario=delayed-media-browse-error#/media-browser/browser",
      loadingSelector: "ha-media-player-browse > ha-spinner",
      readySelector: "ha-media-player-browse ha-alert",
      resolvers: ["rejectMediaBrowse"],
    },
    {
      name: "generated dashboard",
      path: "/?scenario=delayed-generated-dashboard#/climate",
      loadingSelector: "#ha-launch-screen",
      readySelector: "hui-view",
      resolvers: ["resolveGeneratedDashboard"],
    },
    {
      name: "Lovelace dashboard",
      path: "/?scenario=delayed-lovelace#/lovelace",
      loadingSelector: "#ha-launch-screen",
      readySelector: "hui-card",
      resolvers: ["resolveLovelaceConfig"],
    },
  ];

  for (const readinessCase of cases) {
    // eslint-disable-next-line no-await-in-loop
    await test.step(readinessCase.name, async () => {
      await goToPanel(page, readinessCase.path);

      const launchScreen = page.locator("#ha-launch-screen");
      const loadingScreen = page.locator(readinessCase.loadingSelector);
      const readyContent = page.locator(readinessCase.readySelector).first();
      await expect(launchScreen).toBeAttached({ timeout: QUICK_TIMEOUT });
      await expect(loadingScreen).toBeAttached({ timeout: QUICK_TIMEOUT });
      await expect(readyContent).not.toBeAttached();

      await readinessCase.resolvers.reduce(
        async (previousResolver, resolver, index) => {
          await previousResolver;
          await page.evaluate((resolverName) => {
            window[resolverName]?.();
          }, resolver);

          if (index < readinessCase.resolvers.length - 1) {
            await expect(launchScreen).toBeAttached();
            await expect(loadingScreen).toBeAttached();
            await expect(readyContent).not.toBeAttached();
          }
        },
        Promise.resolve()
      );

      await expect(readyContent).toBeAttached({ timeout: PANEL_TIMEOUT });
      await expect(launchScreen).not.toBeAttached({ timeout: QUICK_TIMEOUT });
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
  for (const { view, element, content } of moreInfoViewElements) {
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
      await assertElementContent(dialog, content);
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
  test("config panel loads without JS errors", async ({ page }) => {
    const errors = trackPageErrors(page);

    await goToPanel(page, "/config");
    await expect(
      page.locator("ha-panel-config, ha-config-dashboard").first()
    ).toBeAttached({ timeout: PANEL_TIMEOUT + 5_000 });

    expectNoPageErrors(errors);
  });

  const getDashboard = async (page) => {
    await goToPanel(page, "/config");
    const dashboard = page.locator("ha-config-dashboard");
    await expect(dashboard).toBeAttached({ timeout: QUICK_TIMEOUT });
    return dashboard;
  };

  defineLinkSmokeTests(
    "config links point to expected pages",
    configLinks,
    getDashboard
  );
});
