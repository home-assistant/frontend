/**
 * E2E tests for the HA gallery (port 8100).
 *
 * Each component page is tested by navigating to its hash and asserting that
 * the demo content renders without JS errors and the page element is visible.
 *
 * Run with:
 *   yarn test:e2e:gallery
 */
import { test, expect } from "@playwright/test";
import {
  expectNoPageErrors,
  QUICK_TIMEOUT,
  SHELL_TIMEOUT,
  trackPageErrors,
} from "./helpers";
import {
  defineGallerySmokeTests,
  expectGalleryDemoElement,
  galleryLocator,
  getGalleryDemo,
  goToGalleryHome,
  GALLERY_SHELL_IGNORED_PAGE_ERRORS,
} from "./gallery/helpers";
import { componentPages, lovelacePages, moreInfoPages } from "./gallery/pages";

test.describe("Gallery shell", () => {
  test("page loads and ha-gallery mounts", async ({ page }) => {
    const errors = trackPageErrors(page);

    await goToGalleryHome(page);

    expectNoPageErrors(errors, undefined, GALLERY_SHELL_IGNORED_PAGE_ERRORS);
  });

  test("sidebar renders navigation links", async ({ page }) => {
    await goToGalleryHome(page);
    await expect(galleryLocator(page, "ha-drawer")).toBeAttached({
      timeout: QUICK_TIMEOUT,
    });
  });
});

defineGallerySmokeTests("Components", "components", componentPages);
defineGallerySmokeTests("More-info dialogs", "more-info", moreInfoPages);
defineGallerySmokeTests("Lovelace cards", "lovelace", lovelacePages);

test.describe("Component interactions", () => {
  test("ha-alert renders all four types", async ({ page }) => {
    const demo = await getGalleryDemo(page, "components/ha-alert");

    // The demo uses property binding (.alertType) not attribute binding, so we
    // verify that multiple ha-alert elements are present.
    const alerts = demo.locator("ha-alert");
    await expect(alerts.nth(3)).toBeAttached({ timeout: QUICK_TIMEOUT });
  });

  test("ha-button renders primary action button", async ({ page }) => {
    const demo = await getGalleryDemo(page, "components/ha-button");

    await expectGalleryDemoElement(demo, "ha-button, mwc-button");
  });

  test("ha-control-slider can be found in DOM", async ({ page }) => {
    const demo = await getGalleryDemo(page, "components/ha-control-slider");

    await expectGalleryDemoElement(demo, "ha-control-slider");
  });

  test("ha-form renders schema-driven fields", async ({ page }) => {
    const demo = await getGalleryDemo(page, "components/ha-form");

    await expectGalleryDemoElement(demo, "ha-form");
  });

  test("tile-card renders entity state", async ({ page }) => {
    const demo = await getGalleryDemo(page, "lovelace/tile-card");

    await expectGalleryDemoElement(demo, "hui-tile-card");
  });

  test("more-info light renders controls", async ({ page }) => {
    const demo = await getGalleryDemo(page, "more-info/light");

    await expectGalleryDemoElement(
      demo,
      "ha-control-slider, ha-more-info-light, more-info-content",
      SHELL_TIMEOUT
    );
  });

  test("ha-gauge renders a gauge element", async ({ page }) => {
    await getGalleryDemo(page, "components/ha-gauge");

    // ha-gauge page is markdown-based; gauge elements render in the description area.
    await expect(galleryLocator(page, "ha-gauge").first()).toBeAttached({
      timeout: QUICK_TIMEOUT,
    });
  });

  test("ha-switch toggles state on click", async ({ page }) => {
    const demo = await getGalleryDemo(page, "components/ha-switch");

    // Find the first interactive (non-disabled) switch. Pull its checked state
    // from the property because ha-switch toggles via property, not attribute.
    const switchEl = demo.locator("ha-switch:not([disabled])").first();
    await expect(switchEl).toBeAttached({ timeout: QUICK_TIMEOUT });

    const before = await switchEl.evaluate(
      (el: HTMLElement & { checked?: boolean }) => el.checked === true
    );
    await switchEl.click();
    await expect
      .poll(
        () =>
          switchEl.evaluate(
            (el: HTMLElement & { checked?: boolean }) => el.checked === true
          ),
        { timeout: QUICK_TIMEOUT }
      )
      .toBe(!before);
  });
});
