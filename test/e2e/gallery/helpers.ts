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

const galleryDemoTag = (hash: string) => `demo-${hash.replace(/\//g, "-")}`;

async function waitForGalleryReady(page: Page) {
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
}

async function expectGalleryPageSelector(page: Page, selector: string) {
  const locator = galleryLocator(page, selector).first();
  await expect(locator).toBeAttached({ timeout: SHELL_TIMEOUT });
  return locator;
}

export async function getGalleryDemo(page: Page, hash: string) {
  await goToGalleryPage(page, hash);
  return expectGalleryPageSelector(page, galleryDemoTag(hash));
}

export async function assertGalleryPageLoads(
  page: Page,
  hash: string,
  selector: string
) {
  const errors = trackPageErrors(page);
  await goToGalleryPage(page, hash);
  await expectGalleryPageSelector(page, selector);
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
