/**
 * Shared helpers and constants for Playwright e2e suites.
 */
import { expect, test, type Page, type TestInfo } from "@playwright/test";

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

export interface DefineParallelSmokeTestsOptions<TGroup, TCase> {
  groups: readonly TGroup[];
  groupName: (group: TGroup) => string;
  cases: (group: TGroup) => readonly TCase[];
  testName: (smokeCase: TCase, group: TGroup) => string;
  run: (context: {
    page: Page;
    testInfo: TestInfo;
    group: TGroup;
    smokeCase: TCase;
  }) => Promise<void>;
}

export function defineParallelSmokeTests<TGroup, TCase>({
  groups,
  groupName,
  cases,
  testName,
  run,
}: DefineParallelSmokeTestsOptions<TGroup, TCase>) {
  for (const group of groups) {
    test.describe(groupName(group), () => {
      test.describe.configure({ mode: "parallel" });

      for (const smokeCase of cases(group)) {
        test(testName(smokeCase, group), async ({ page }, testInfo) => {
          await run({ page, testInfo, group, smokeCase });
        });
      }
    });
  }
}
