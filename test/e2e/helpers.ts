/**
 * Shared helpers and constants for Playwright e2e suites.
 */

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
