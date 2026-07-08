import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  expectNoPageErrors,
  QUICK_TIMEOUT,
  SHELL_TIMEOUT,
  trackPageErrors,
} from "../helpers";

export const GALLERY_IGNORED_PAGE_ERRORS: RegExp[] = [
  /ResizeObserver/,
  /Non-Error/,
  /Extension context/,
  // Plain objects thrown by mock WebSocket/data-fetch show up as "Object".
  /^Object$/,
  // hui-group-entity-row calls .some() on a possibly-undefined entity_id array
  // from mock state data - pre-existing gallery data issue.
  /Cannot read properties of undefined \(reading 'some'\)/,
];

export interface GalleryPageSmokeCase {
  name: string;
  selector: string;
}

export const galleryLocator = (page: Page, selector: string) =>
  page.locator(`ha-gallery >> ${selector}`);

export const galleryDemoTag = (hash: string) =>
  `demo-${hash.replace(/\//g, "-")}`;

export async function waitForGalleryReady(page: Page) {
  await expect(page.locator("ha-gallery")).toBeAttached({
    timeout: SHELL_TIMEOUT,
  });
}

export async function goToGalleryHome(page: Page) {
  await page.goto("/");
  await waitForGalleryReady(page);
}

export async function goToGalleryPage(page: Page, hash: string) {
  await page.goto(`/#${hash}`);
  await waitForGalleryReady(page);

  // page-description is only rendered for pages with descriptions, so wait for
  // the demo tag derived from the hash instead.
  await page.waitForFunction(
    (tag) =>
      document.querySelector("ha-gallery")?.shadowRoot?.querySelector(tag),
    galleryDemoTag(hash),
    { timeout: SHELL_TIMEOUT }
  );
}

export async function getGalleryDemo(page: Page, hash: string) {
  await goToGalleryPage(page, hash);
  const demo = galleryLocator(page, galleryDemoTag(hash));
  await expect(demo).toBeAttached({ timeout: SHELL_TIMEOUT });
  return demo;
}

export async function assertGalleryPageLoads(
  page: Page,
  hash: string,
  selector: string
) {
  const errors = trackPageErrors(page);
  await goToGalleryPage(page, hash);

  await expect(galleryLocator(page, selector).first()).toBeAttached({
    timeout: SHELL_TIMEOUT,
  });
  expectNoPageErrors(errors, hash, GALLERY_IGNORED_PAGE_ERRORS);
}

export function defineGallerySmokeTests(
  groupName: string,
  routePrefix: string,
  pages: GalleryPageSmokeCase[]
) {
  test.describe(groupName, () => {
    for (const { name, selector } of pages) {
      test(`${name} renders without errors`, async ({ page }) => {
        await assertGalleryPageLoads(page, `${routePrefix}/${name}`, selector);
      });
    }
  });
}

export async function expectGalleryDemoElement(
  demo: Locator,
  selector: string,
  timeout = QUICK_TIMEOUT
) {
  await expect(demo.locator(selector).first()).toBeAttached({ timeout });
}
