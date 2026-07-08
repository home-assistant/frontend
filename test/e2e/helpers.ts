/**
 * Shared helpers and constants for Playwright e2e suites.
 */
import { expect, type Page } from "@playwright/test";

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

type PageError = { message: string } | string;

export const IGNORED_PAGE_ERRORS: RegExp[] = [
  /ResizeObserver/,
  /Non-Error/,
  /Extension context/,
];

export function trackPageErrors(page: Page) {
  const errors: PageError[] = [];
  page.on("pageerror", (error) => errors.push(error));
  return errors;
}

export function pageErrors(
  errors: PageError[],
  ignoredErrors = IGNORED_PAGE_ERRORS
) {
  return errors
    .map((error) => (typeof error === "string" ? error : error.message))
    .filter((message) =>
      ignoredErrors.every((pattern) => !pattern.test(message))
    );
}

export function expectNoPageErrors(
  errors: PageError[],
  context?: string,
  ignoredErrors = IGNORED_PAGE_ERRORS
) {
  const realErrors = pageErrors(errors, ignoredErrors);
  const details = realErrors.length ? `: ${realErrors.join("; ")}` : "";
  expect(
    realErrors,
    context ? `JS errors on ${context}${details}` : `JS errors${details}`
  ).toHaveLength(0);
}
