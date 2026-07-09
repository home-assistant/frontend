import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  defineParallelSmokeTests,
  PANEL_TIMEOUT,
  QUICK_TIMEOUT,
  SHELL_TIMEOUT,
} from "../../helpers";

const APP_MAIN_SELECTOR = "ha-test >> home-assistant-main";
const APP_SIDEBAR_SELECTOR = `${APP_MAIN_SELECTOR} >> ha-sidebar`;

// The app e2e harness is built with __DEMO__=true, which enables hash routing.
// Scenario selection uses query params at root: /?scenario=foo#/lovelace.
export async function goToPanel(page: Page, path: string) {
  const url = path.startsWith("/?") ? path : `/#${path}`;
  await page.goto(url);
  await Promise.all([
    page.waitForSelector("ha-test", {
      state: "attached",
      timeout: SHELL_TIMEOUT,
    }),
    page.waitForFunction(
      () => "__mockHass" in window && Boolean(window.__mockHass),
      undefined,
      { timeout: SHELL_TIMEOUT }
    ),
  ]);
}

export const appMain = (page: Page) => page.locator(APP_MAIN_SELECTOR);

export const appSidebar = (page: Page) => page.locator(APP_SIDEBAR_SELECTOR);

export const appSidebarPanel = (page: Page, panel: string) =>
  appSidebar(page).locator(`#sidebar-panel-${panel}`);

export const appSidebarConfig = (page: Page) =>
  appSidebar(page).locator("#sidebar-config");

export async function openAppSidebar(page: Page) {
  await appMain(page).evaluate((el) => {
    el.dispatchEvent(
      new CustomEvent("hass-toggle-menu", {
        detail: { open: true },
        bubbles: true,
        composed: true,
      })
    );
  });
}

export async function ensureAppSidebarPanelVisible(page: Page, panel: string) {
  await expect(appSidebar(page)).toBeAttached({ timeout: QUICK_TIMEOUT });

  const link = appSidebarPanel(page, panel);
  if (!(await link.isVisible().catch(() => false))) {
    await openAppSidebar(page);
  }
  await expect(link).toBeVisible({ timeout: QUICK_TIMEOUT });
  return link;
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface LinkSmokeCase {
  href: string;
  label: string;
}

export async function assertLink(
  root: Locator,
  { href, label }: LinkSmokeCase
) {
  const link = root.getByRole("link", {
    name: new RegExp(`^${escapeRegExp(label)}\\b`),
  });
  await expect(link).toHaveAttribute("href", href, {
    timeout: QUICK_TIMEOUT,
  });
}

export function defineLinkSmokeTests(
  name: string,
  links: LinkSmokeCase[],
  getRoot: (page: Page) => Promise<Locator>
) {
  test(name, async ({ page }) => {
    const root = await getRoot(page);

    await Promise.all(
      links.map((link) =>
        test.step(`${link.label} links to ${link.href}`, async () => {
          await assertLink(root, link);
        })
      )
    );
  });
}

export interface ElementContentAssertion {
  selector: string;
  text?: string;
}

export interface ViewElementSmokeCase<TView extends string = string> {
  view: TView;
  element: string;
  content: ElementContentAssertion[];
}

export async function assertElementContent(
  root: Locator,
  content: ElementContentAssertion[]
) {
  await Promise.all(
    content.map(({ selector, text }) => {
      const locator = root.locator(selector).first();
      return text
        ? expect(locator).toContainText(text, { timeout: QUICK_TIMEOUT })
        : expect(locator).toBeAttached({ timeout: QUICK_TIMEOUT });
    })
  );
}

export interface RouteSmokeCase {
  name?: string;
  path: string;
  element: string;
  projects?: string[];
  url?: RegExp;
  action?: (page: Page) => Promise<void>;
}

export interface RouteSmokeGroup {
  name: string;
  routes: RouteSmokeCase[];
  testName?: (route: RouteSmokeCase) => string;
  projects?: string[];
}

export const routeCase = (path: string, element: string): RouteSmokeCase => ({
  path,
  element,
});

export const routeCases = (routes: [string, string][]): RouteSmokeCase[] =>
  routes.map(([path, element]) => routeCase(path, element));

export const rendersRoute = (route: RouteSmokeCase) => `renders ${route.path}`;

async function assertRouteSmoke(page: Page, route: RouteSmokeCase) {
  await goToPanel(page, route.path);
  await route.action?.(page);
  if (route.url) {
    await expect(page).toHaveURL(route.url, { timeout: QUICK_TIMEOUT });
  }
  await expect(page.locator(route.element).first()).toBeAttached({
    timeout: PANEL_TIMEOUT,
  });
}

function shouldRunRouteSmoke(
  projectName: string,
  group: RouteSmokeGroup,
  route: RouteSmokeCase
) {
  return (route.projects ?? group.projects)?.includes(projectName) ?? true;
}

export function defineRouteSmokeTests(groups: RouteSmokeGroup[]) {
  defineParallelSmokeTests({
    groups,
    groupName: (group) => group.name,
    cases: (group) => group.routes,
    testName: (route, group) =>
      route.name ?? group.testName?.(route) ?? rendersRoute(route),
    run: async ({ page, testInfo, group, smokeCase }) => {
      test.skip(
        !shouldRunRouteSmoke(testInfo.project.name, group, smokeCase),
        "Route smoke coverage does not run for this project"
      );
      await assertRouteSmoke(page, smokeCase);
    },
  });
}
