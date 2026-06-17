/**
 * Shared helpers and constants for Playwright e2e suites.
 */
import { test, type Page } from "@playwright/test";

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

// ── Error filtering ─────────────────────────────────────────────────────────

/**
 * BrowserStack tunnel sometimes fails to deliver dynamic-import chunks on
 * mobile/iOS combos. These are infrastructure errors, not app bugs.
 */
export const DYNAMIC_IMPORT_ERROR =
  /error loading dynamically imported module|Importing a module script failed/i;

/**
 * Filter out errors known to be unrelated to the app under test:
 *   - ResizeObserver loop notifications (browser quirk, harmless)
 *   - Non-Error rejections (mock data throws plain objects)
 *   - Browser extension noise
 *   - Dynamic-import infra failures (see DYNAMIC_IMPORT_ERROR above)
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
      !msg.includes("Extension context") &&
      !DYNAMIC_IMPORT_ERROR.test(msg)
  );
}

/**
 * Wait for `selector` and skip the test (visibly) if the wait fails due to
 * a known BrowserStack tunnel infrastructure issue. Re-throws any other error
 * so genuine app bugs still surface as test failures.
 *
 * The BrowserStack iOS WebKit driver occasionally raises a CDP-level
 * "Internal error" from `page.locator.waitFor` — these are tunnel/driver
 * issues, not app bugs. We narrow the substring match to the specific
 * Playwright error message so we don't accidentally swallow real "Internal
 * error" exceptions thrown by application code.
 */
export async function waitForOrSkip(
  page: Page,
  selector: string,
  state: "attached" | "visible" = "attached",
  timeout = NAVIGATION_TIMEOUT,
  pageErrors: Error[] = []
) {
  try {
    await page.locator(selector).first().waitFor({ state, timeout });
    return "ok" as const;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // A dynamic-import network failure (recorded via pageerror) means the
    // JS chunk this test depends on never loaded — skip rather than fail.
    if (pageErrors.some((e) => DYNAMIC_IMPORT_ERROR.test(e.message))) {
      test.skip(true, `dynamic-import infra failure for "${selector}"`);
    }
    // BrowserStack iOS WebKit raises `locator.waitFor: Internal error` from
    // the CDP layer. Match the exact prefix so app-thrown "Internal error"
    // strings don't get masked.
    if (/locator\.waitFor:.*Internal error/i.test(msg)) {
      test.skip(
        true,
        `BrowserStack iOS WebKit CDP "Internal error" for "${selector}"`
      );
    }
    throw err;
  }
}
