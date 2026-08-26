import { expect, type Page } from "@playwright/test";
import type { HaDrawer } from "../../../src/components/ha-drawer";
import type { ThemeSettings } from "../../../src/types";
import { NAVIGATION_TIMEOUT, SHELL_TIMEOUT } from "../helpers";

export const DEMO_THEME_STORAGE_KEY = "demo_theme";

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
  const drawer = page.locator("ha-drawer");
  await expect(drawer).toBeAttached({ timeout: NAVIGATION_TIMEOUT });

  // Pick the layout from ha-drawer, which home-assistant-main sets to "modal"
  // while committing its very first render (the narrow media query is resolved
  // synchronously in its constructor). ha-menu-button must not be used for
  // this: it renders nothing until its Lit contexts resolve, so sampling its
  // visibility straight after load reports "hidden" on the narrow layout too,
  // and the drawer would then silently never be opened.
  const isModal = await drawer.evaluate(
    (element) => (element as HaDrawer).type === "modal"
  );

  if (!isModal) {
    // Wide layout: the sidebar is permanently on screen.
    await expect(page.locator("ha-sidebar")).toBeVisible({
      timeout: NAVIGATION_TIMEOUT,
    });
    return;
  }

  const menuButton = page.locator("ha-menu-button");
  await expect(menuButton).toBeVisible({ timeout: SHELL_TIMEOUT });
  await menuButton.click();
  // ha-drawer reflects `open` once the app has actually opened the drawer.
  // The slide-in animation is covered by Playwright's stability check on the
  // next interaction.
  await expect(drawer).toHaveAttribute("open", "", { timeout: SHELL_TIMEOUT });
}

export async function activateDemoSidebarPanel(page: Page, panel: string) {
  const navItem = page.locator(`#sidebar-panel-${panel}`);
  await expect(navItem).toBeVisible({ timeout: SHELL_TIMEOUT });
  await navItem.click();
  await expect(page).toHaveURL(new RegExp(`/${panel}(?:/|$)`), {
    timeout: SHELL_TIMEOUT,
  });
}
