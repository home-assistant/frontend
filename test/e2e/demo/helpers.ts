import { expect, type Page } from "@playwright/test";
import { NAVIGATION_TIMEOUT, SHELL_TIMEOUT } from "../helpers";

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

export async function openDemoSidebar(page: Page) {
  const menuButton = page.locator("ha-menu-button");
  if (await menuButton.isVisible()) {
    await menuButton.click();
    await expect(page.locator("ha-sidebar")).toBeVisible({
      timeout: SHELL_TIMEOUT,
    });
    return;
  }

  await expect(page.locator("ha-sidebar")).toBeAttached({
    timeout: NAVIGATION_TIMEOUT,
  });
}

export async function clickFirstVisibleDemoSidebarPanel(
  page: Page,
  panels: string[]
) {
  for (const panel of panels) {
    const navItem = page.locator(`#sidebar-panel-${panel}`);
    // eslint-disable-next-line no-await-in-loop
    if (await navItem.isVisible().catch(() => false)) {
      // eslint-disable-next-line no-await-in-loop
      await navItem.click();
      // eslint-disable-next-line no-await-in-loop
      await expect(page).toHaveURL(new RegExp(`/${panel}`), {
        timeout: SHELL_TIMEOUT,
      });
      return true;
    }
  }

  return false;
}
