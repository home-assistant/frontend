/**
 * E2E tests for the HA test app (port 8095).
 *
 * Run with:
 *   yarn test:e2e:app
 */
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import {
  appSidebar,
  appSidebarConfig,
  appSidebarPanel,
  assertElementContent,
  defineLinkSmokeTests,
  defineRouteSmokeTests,
  ensureAppSidebarPanelVisible,
  goToPanel,
  openMoreInfoDialog,
  openSystemLogDetail,
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
  connectivityLinks,
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

test.describe("System log reporting", () => {
  let errors: ReturnType<typeof trackPageErrors>;

  test.beforeEach(async ({ page }) => {
    errors = trackPageErrors(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => {
            document.body.dataset.copiedReport = text;
          },
        },
      });
    });
  });

  test.afterEach(() => {
    expectNoPageErrors(errors);
  });

  test("opens the frontend form directly with the selected log details", async ({
    page,
    context,
  }) => {
    const requests: string[] = [];
    await context.route("https://github.com/**", async (route) => {
      requests.push(route.request().url());
      await route.fulfill({
        contentType: "text/html",
        body: "Issue form fixture",
      });
    });

    const dialog = await openSystemLogDetail(
      page,
      "TypeError: Report fixture failed"
    );

    const reportLink = dialog.getByRole("link", {
      name: "report it on the Frontend repository",
      exact: true,
    });

    expect(requests).toEqual([]);

    await expect(
      dialog.getByRole("link", { name: "reporting guide", exact: true })
    ).toHaveAttribute(
      "href",
      "https://www.home-assistant.io/help/reporting_issues/"
    );

    const popup = context.waitForEvent("page");
    await reportLink.click();
    await (await popup).waitForLoadState();
    expect(requests).toHaveLength(1);
    const submitted = new URL(requests[0]);
    expect(submitted.pathname).toBe("/home-assistant/frontend/issues/new");
    expect(Object.fromEntries(submitted.searchParams)).toEqual({
      template: "bug_report.yml",
      core_version: expect.any(String),
      javascript_errors:
        "frontend.js.modern.202609180\n\ncomponents/system_log/__init__.py:350\n\nUncaught error from Firefox 140.0 on Linux\nTypeError: Report fixture failed\nrender@src/example.ts:10:2\n\nAnother occurrence: café & ? # %\n```",
    });

    const form = load(
      readFileSync(".github/ISSUE_TEMPLATE/bug_report.yml", "utf8")
    );

    for (const id of ["core_version", "javascript_errors"]) {
      expect(form).toEqual(
        expect.objectContaining({
          body: expect.arrayContaining([
            expect.objectContaining({
              id,
              type: expect.stringMatching(/^(input|textarea)$/),
            }),
          ]),
        })
      );
    }

    await expect(dialog.locator(".contents")).toBeVisible();
  });

  for (const { message, destination, params } of [
    ...[
      "Built-in integration error",
      "Error with relative integration source",
    ].map((logMessage) => ({
      message: logMessage,
      destination: "https://github.com/home-assistant/core/issues/new",
      params: {
        template: "bug_report.yml",
        version: expect.any(String),
        installation_type: "Home Assistant OS",
        logs: expect.stringContaining("ValueError:"),
        integration_name: "Philips Hue",
        integration_link: "https://www.home-assistant.io/integrations/hue/",
      },
    })),
    {
      message: "General Core error",
      destination: "https://github.com/home-assistant/core/issues/new",
      params: {
        template: "bug_report.yml",
        version: expect.any(String),
        installation_type: "Home Assistant OS",
        logs: expect.stringContaining("RuntimeError: Test error"),
      },
    },
    ...["Custom integration error", "Custom override error"].map(
      (logMessage) => ({
        message: logMessage,
        destination: "https://example.com/issues",
        params: { project: "example" },
      })
    ),
  ]) {
    test(`routes ${message} to its issue tracker`, async ({ page }) => {
      const dialog = await openSystemLogDetail(page, message);

      const link = dialog.getByRole("link", {
        name: /^report /i,
        exact: true,
      });

      await expect(link).toHaveAttribute("target", "_blank");

      await expect(async () => {
        const url = new URL((await link.getAttribute("href")) ?? "");

        expect(`${url.origin}${url.pathname}`).toBe(destination);
        expect(Object.fromEntries(url.searchParams)).toEqual(params);

        if ("logs" in params) {
          expect(url.searchParams.get("logs")).toContain(message);
        }
      }).toPass({ timeout: QUICK_TIMEOUT });
    });
  }

  for (const message of [
    "Missing tracker error",
    "Unsafe tracker error",
    "Failed manifest error",
  ]) {
    test(`falls back to the base template for ${message}`, async ({ page }) => {
      const dialog = await openSystemLogDetail(page, message);
      await expect(
        dialog.getByRole("link", {
          name: /^report /i,
          exact: true,
        })
      ).toHaveAttribute(
        "href",
        "https://github.com/home-assistant/core/issues/new?template=bug_report.yml"
      );
      await dialog.locator("#copy").click();
      await expect(page.locator("body")).toHaveAttribute(
        "data-copied-report",
        new RegExp(message)
      );
    });
  }

  test("ignores a manifest response after selecting another entry", async ({
    page,
  }) => {
    await goToPanel(page, "/?scenario=system-log-reporting#/config/logs");
    await page
      .locator("system-log-card ha-list-item")
      .filter({ hasText: "Delayed manifest error" })
      .click();
    const detail = page.locator("dialog-system-log-detail");
    await expect(
      detail.getByRole("link", {
        name: /^report /i,
        exact: true,
      })
    ).toHaveAttribute(
      "href",
      "https://github.com/home-assistant/core/issues/new?template=bug_report.yml"
    );
    await detail.getByRole("button", { name: "Close", exact: true }).click();
    await expect(detail.locator("ha-dialog")).not.toBeAttached();
    await page
      .locator("system-log-card ha-list-item")
      .filter({ hasText: "Built-in integration error" })
      .click();
    await page.evaluate(() => window.resolveReportManifest?.());
    await expect(
      detail.getByRole("link", {
        name: /^report /i,
        exact: true,
      })
    ).toHaveAttribute(
      "href",
      /\/home-assistant\/core\/issues\/new\?.*integration_name=Philips\+Hue/
    );
  });

  test("replaces the base template when the manifest arrives", async ({
    page,
  }) => {
    const dialog = await openSystemLogDetail(page, "Delayed manifest error");
    const link = dialog.getByRole("link", { name: /^report /i, exact: true });

    await expect(link).toHaveAttribute(
      "href",
      "https://github.com/home-assistant/core/issues/new?template=bug_report.yml"
    );
    await page.evaluate(() => window.resolveReportManifest?.());
    await expect(link).toHaveAttribute(
      "href",
      "https://example.com/delayed/issues"
    );
  });
});

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
      | "resolveConnectivityConfigEntries"
      | "resolveConfigEntries"
      | "resolveConfigEntriesInProgress"
      | "resolveGeneratedDashboard"
      | "resolveLovelaceConfig"
      | "resolveMediaBrowse"
      | "resolveSerialPorts"
      | "resolveStorageHostInfo"
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
      name: "connectivity",
      path: "/?scenario=delayed-connectivity#/config/connectivity",
      loadingSelector: "ha-config-connectivity ha-card",
      readySelector: "ha-config-connectivity ha-list-item-button",
      resolvers: ["resolveConnectivityConfigEntries"],
    },
    {
      name: "serial",
      path: "/?scenario=delayed-serial#/config/serial",
      loadingSelector: "serial-config-dashboard ha-spinner",
      readySelector: "serial-config-dashboard .empty",
      resolvers: ["resolveSerialPorts"],
    },
    {
      name: "storage",
      path: "/?scenario=delayed-storage#/config/storage",
      loadingSelector: "ha-config-section-storage",
      readySelector: "ha-config-section-storage hass-subpage",
      resolvers: ["resolveStorageHostInfo"],
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
      readySelector: "hui-card",
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

test.describe("Energy dashboard", () => {
  test("returns to Energy after repeatedly opening the device dialog", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);
    await goToPanel(
      page,
      "/?historyBack=1&backPath=%2Flovelace#/energy/overview"
    );
    const energyRoot = page.locator("ha-panel-energy hui-root");
    await expect(energyRoot).toBeAttached({ timeout: PANEL_TIMEOUT });

    const editDashboard = energyRoot.getByRole("button", {
      name: /^Edit dashboard\b/,
    });
    const dashboardMenu = energyRoot.getByRole("button", {
      name: "Open dashboard menu",
    });
    await expect(editDashboard.or(dashboardMenu)).toBeVisible({
      timeout: QUICK_TIMEOUT,
    });
    if (await editDashboard.isVisible()) {
      await editDashboard.click();
    } else {
      await dashboardMenu.click();
      await page.getByRole("menuitem", { name: /^Edit dashboard\b/ }).click();
    }

    await expect(page.locator("ha-config-energy")).toBeAttached({
      timeout: PANEL_TIMEOUT,
    });

    const backLink = page
      .locator("ha-config-energy hass-tabs-subpage")
      .getByRole("link", { name: "Back" });
    await expect(backLink).toHaveAttribute(
      "href",
      "/config/lovelace/dashboards"
    );

    const addDevice = page
      .locator("ha-energy-device-settings")
      .locator("ha-button")
      .first();
    const openAndCancelDeviceDialog = async () => {
      await addDevice.click();
      const dialog = page.locator("dialog-energy-device-settings");
      const cancel = dialog.locator("ha-dialog-footer ha-button").first();
      await expect(cancel).toBeVisible({ timeout: QUICK_TIMEOUT });
      await cancel.click();
      await expect(cancel).toBeHidden({ timeout: QUICK_TIMEOUT });
    };
    await openAndCancelDeviceDialog();
    await openAndCancelDeviceDialog();
    await openAndCancelDeviceDialog();

    await backLink.click();

    await expect
      .poll(
        () =>
          page.evaluate(() => ({
            hash: window.location.hash,
            search: window.location.search,
          })),
        { timeout: PANEL_TIMEOUT }
      )
      .toEqual({
        hash: "#/energy/overview",
        search: "?historyBack=1&backPath=%2Flovelace",
      });
    await expect(page.locator("ha-panel-energy")).toBeAttached();
    await expect(
      energyRoot.getByRole("link", { name: "Back" })
    ).toHaveAttribute("href", "/lovelace");
    expectNoPageErrors(errors);
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

      // Fire the standard hass-more-info event from the app root with an
      // explicit view. The HA shell opens ha-more-info-dialog on the requested
      // view directly, so the test does not depend on the admin/demo-hidden
      // header controls.
      const dialog = await openMoreInfoDialog(
        page,
        "light.test_light",
        view,
        element
      );

      // Each view should render its own characteristic content, not just an
      // empty shell.
      await assertElementContent(dialog, content);
    });
  }
});

test.describe("Weather more-info forecast", () => {
  test("switches the rendered forecast when a tab is selected", async ({
    page,
  }) => {
    await goToPanel(
      page,
      "/?scenario=weather-more-info&more-info-entity-id=weather.test_weather&more-info-view=info#/lovelace"
    );

    const dialog = page.locator("ha-more-info-dialog");
    const weather = dialog.locator("more-info-weather");
    await expect(weather).toBeAttached({ timeout: SHELL_TIMEOUT });
    await expect(page).toHaveURL(
      /more-info-entity-id=weather\.test_weather&more-info-view=info/
    );
    await expect(
      weather.locator("ha-tab-group-tab[active]").filter({ hasText: "Daily" })
    ).toBeAttached();

    // Only the hourly and twice daily forecasts group their items under a day
    // header, so it tells the rendered forecast apart from the daily one.
    await expect(weather.locator(".forecast-day-header")).toHaveCount(0);

    await weather
      .locator("ha-tab-group-tab")
      .filter({ hasText: "Hourly" })
      .click();

    await expect(
      weather.locator("ha-tab-group-tab[active]").filter({ hasText: "Hourly" })
    ).toBeAttached();
    await expect(weather.locator(".forecast-day-header").first()).toBeVisible();

    await dialog.getByRole("button", { name: "History" }).click();
    await expect(page).toHaveURL(/more-info-view=history/);

    await dialog.getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/more-info-view=info/);

    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
    await expect(page).not.toHaveURL(/more-info-entity-id/);
  });
});

test.describe("More-info dialog URL cleanup", () => {
  test("strips the deep-link params on a plain close", async ({ page }) => {
    const errors = trackPageErrors(page);

    // An exact route so no default-page redirect races the dialog open.
    await goToPanel(page, "/?scenario=light-more-info#/config/dashboard");

    const dialog = await openMoreInfoDialog(page, "light.test_light");

    await expect(page).toHaveURL(/more-info-entity-id=light\.test_light/);

    await dialog.getByRole("button", { name: "Close" }).click();

    // The dialog re-renders empty once its close cleanup has run.
    await expect(dialog.locator("ha-adaptive-dialog")).toHaveCount(0, {
      timeout: QUICK_TIMEOUT,
    });

    await expect(page).not.toHaveURL(/more-info-entity-id/);
    await expect(page).toHaveURL(/#\/config\/dashboard/);
    expectNoPageErrors(errors);
  });

  test.describe("when navigation closes the dialog", () => {
    // --ha-dialog-hide-duration only applies in dialog mode; the bottom sheet
    // hardcodes its animation duration, so pin a desktop viewport on every
    // project to keep the slow-close setup below effective.
    test.use({ viewport: { width: 1280, height: 800 } });

    test("keeps the new URL when navigation outpaces the close transition", async ({
      page,
    }) => {
      const errors = trackPageErrors(page);

      // An exact route so no default-page redirect races the dialog open.
      await goToPanel(page, "/?scenario=light-more-info#/config/dashboard");

      const dialog = await openMoreInfoDialog(page, "light.test_light");

      await expect(page).toHaveURL(/more-info-entity-id=light\.test_light/);

      // Make the hide transition outlast navigate()'s dialog-close wait so
      // the navigation commits its URL while the dialog is still closing,
      // like on a slow device or with a long themed animation.
      await page.evaluate(() => {
        document.documentElement.style.setProperty(
          "--ha-dialog-hide-duration",
          "1200ms"
        );
      });

      // Navigate through a synthetic same-origin link: the dialog scrim
      // blocks real link clicks and the dialog's own edit/device actions are
      // hidden in the demo build, while navigate() closes open dialogs the
      // same way for all of them.
      await page.evaluate(() => {
        const anchor = document.createElement("a");
        anchor.href = "/history";
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
      });

      await expect(page).toHaveURL(/#\/history/, { timeout: QUICK_TIMEOUT });

      // The navigation must commit while the dialog is still closing,
      // otherwise this test no longer covers the regression.
      await expect(dialog.locator("ha-adaptive-dialog")).toHaveCount(1);

      // The dialog re-renders empty once its close cleanup has run.
      await expect(dialog.locator("ha-adaptive-dialog")).toHaveCount(0, {
        timeout: QUICK_TIMEOUT,
      });

      // The cleanup must not rewrite the URL back to the pre-dialog page.
      await expect(page).toHaveURL(/#\/history/);
      await expect(page).not.toHaveURL(/more-info-entity-id/);
      expectNoPageErrors(errors);
    });
  });
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

  // Reached by clicking through from the dashboard: the e2e harness only
  // resolves config panel translations once the dashboard has mounted.
  const getConnectivity = async (page) => {
    const dashboard = await getDashboard(page);
    await dashboard.getByRole("link", { name: /^Connectivity\b/ }).click();
    const connectivity = page.locator("ha-config-connectivity");
    await expect(connectivity).toBeAttached({ timeout: PANEL_TIMEOUT });
    return connectivity;
  };

  defineLinkSmokeTests(
    "connectivity links point to expected pages",
    connectivityLinks,
    getConnectivity
  );
});
