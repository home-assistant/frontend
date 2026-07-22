import { expect, type Page } from "@playwright/test";
import type { ThemeSettings } from "../../../src/types";
import { NAVIGATION_TIMEOUT, SHELL_TIMEOUT } from "../helpers";

const DEMO_THEME_STORAGE_KEY = "demo_theme";

export const demoCardSelector = [
  "hui-tile-card",
  "hui-entity-card",
  "hui-glance-card",
  "hui-button-card",
  "hui-markdown-card",
].join(", ");

export const moreInfoCardSelector =
  "hui-tile-card, hui-entity-card, hui-button-card, hui-glance-card";

export async function waitForDemoReady(page: Page) {
  await expect(page.locator("ha-demo")).toBeAttached({
    timeout: NAVIGATION_TIMEOUT,
  });
  await expect(page.locator("#ha-launch-screen")).toBeHidden({
    timeout: NAVIGATION_TIMEOUT,
  });
}

export async function loadDemo(page: Page, path = "/") {
  await page.goto(path);
  await waitForDemoReady(page);
}

export async function reloadDemo(page: Page) {
  await page.reload();
  await waitForDemoReady(page);
}

export async function expectDemoDarkMode(page: Page, darkMode: boolean) {
  await expect
    .poll(
      () =>
        page.locator("ha-demo").evaluate((element) => {
          const demo = element as HTMLElement & {
            hass?: { themes?: { darkMode?: boolean } };
          };
          return demo.hass?.themes?.darkMode;
        }),
      { timeout: SHELL_TIMEOUT }
    )
    .toBe(darkMode);
}

export async function expectStoredDemoTheme(
  page: Page,
  expected: ThemeSettings
) {
  await expect
    .poll(
      () =>
        page.evaluate((storageKey) => {
          const storedTheme = localStorage.getItem(storageKey);
          return storedTheme ? (JSON.parse(storedTheme) as unknown) : null;
        }, DEMO_THEME_STORAGE_KEY),
      { timeout: SHELL_TIMEOUT }
    )
    .toEqual(expected);
}

export async function openDemoSidebar(page: Page) {
  const menuButton = page.locator("ha-menu-button");
  if (await menuButton.isVisible()) {
    const modalDrawer = page.locator("ha-drawer").locator("wa-drawer");
    await Promise.all([
      modalDrawer.evaluate(
        (element) =>
          new Promise<void>((resolve) => {
            element.addEventListener("wa-after-show", () => resolve(), {
              once: true,
            });
          })
      ),
      menuButton.click(),
    ]);
    return;
  }

  await expect(page.locator("ha-sidebar")).toBeAttached({
    timeout: NAVIGATION_TIMEOUT,
  });
}

export async function activateDemoSidebarPanel(page: Page, panel: string) {
  const navItem = page.locator(`#sidebar-panel-${panel}`);
  await expect(navItem).toBeVisible({ timeout: SHELL_TIMEOUT });
  await navItem.click();
  await expect(page).toHaveURL(new RegExp(`/${panel}(?:/|$)`), {
    timeout: SHELL_TIMEOUT,
  });
}
