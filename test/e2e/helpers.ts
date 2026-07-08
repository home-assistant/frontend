/**
 * Shared helpers and constants for Playwright e2e suites.
 */
import { expect, test, type Locator, type Page } from "@playwright/test";

// ── Timeouts ────────────────────────────────────────────────────────────────
// Centralised so tweaks don't require search-and-replace across spec files.
// Values are in milliseconds.

/** Single fast UI assertion (element should already be there). */
export const QUICK_TIMEOUT = 10_000;
/** Standard app-shell readiness wait. */
export const SHELL_TIMEOUT = 15_000;
/** Heavier panel/dialog loads that involve dynamic imports. */
export const PANEL_TIMEOUT = 20_000;
/** First navigation / cold-cache loads on slow runners. */
export const NAVIGATION_TIMEOUT = 30_000;

// ── App navigation ──────────────────────────────────────────────────────────

// The app e2e harness is built with __DEMO__=true, which enables hash routing.
// Scenario selection uses query params at root: /?scenario=foo#/lovelace.
export async function goToPanel(page: Page, path: string) {
  const url = path.startsWith("/?") ? path : `/#${path}`;
  await page.goto(url);
  await page.waitForSelector("ha-test", {
    state: "attached",
    timeout: SHELL_TIMEOUT,
  });
  await page.waitForFunction(
    () => Boolean((window as any).__mockHass),
    undefined,
    { timeout: SHELL_TIMEOUT }
  );
}

// ── Error filtering ─────────────────────────────────────────────────────────

/**
 * Filter out errors known to be unrelated to the app under test:
 *   - ResizeObserver loop notifications (browser quirk, harmless)
 *   - Non-Error rejections (mock data throws plain objects)
 *   - Browser extension noise
 */
export function appErrors(errors: { message: string }[] | string[]) {
  const messages =
    typeof errors[0] === "string"
      ? (errors as string[])
      : (errors as { message: string }[]).map((e) => e.message);
  return messages.filter(
    (msg) =>
      !msg.includes("ResizeObserver") &&
      !msg.includes("Non-Error") &&
      !msg.includes("Extension context")
  );
}

// ── Link smoke helpers ──────────────────────────────────────────────────────

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
  links: LinkSmokeCase[],
  getRoot: (page: Page) => Promise<Locator>
) {
  for (const link of links) {
    test(`${link.label} links to ${link.href}`, async ({ page }) => {
      await assertLink(await getRoot(page), link);
    });
  }
}

// ── Element smoke types ─────────────────────────────────────────────────────

export interface ElementContentAssertion {
  selector: string;
  text?: string;
}

export interface ViewElementSmokeCase<TView extends string = string> {
  view: TView;
  element: string;
  content: ElementContentAssertion[];
}

// ── Route smoke helpers ─────────────────────────────────────────────────────

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
  for (const group of groups) {
    test.describe(group.name, () => {
      for (const route of group.routes) {
        test(
          route.name ?? group.testName?.(route) ?? rendersRoute(route),
          async ({ page }, testInfo) => {
            test.skip(
              !shouldRunRouteSmoke(testInfo.project.name, group, route),
              "Route smoke coverage does not run for this project"
            );
            await assertRouteSmoke(page, route);
          }
        );
      }
    });
  }
}
