import { expect, test } from "@playwright/test";
import { demoConfig } from "../../src/fake_data/demo_config";
import {
  completeAnalytics,
  completeCoreConfig,
  createOwner,
  expectDefaultDashboard,
  finishIntegrations,
  onboardingData,
  openOnboarding,
  setupOnboardingMocks,
} from "./app/src/onboarding";
import { expectNoPageErrors, trackPageErrors } from "./helpers";

test.use({ serviceWorkers: "block" });

test("completes onboarding and opens the default dashboard", async ({
  page,
  baseURL,
}) => {
  const errors = trackPageErrors(page);
  const calls = await setupOnboardingMocks(page);

  await test.step("welcome", () => openOnboarding(page, baseURL!));
  await test.step("create account", () => createOwner(page));
  await test.step("configure Home Assistant", () => completeCoreConfig(page));
  await test.step("choose analytics", () => completeAnalytics(page));
  await test.step("finish integrations", () => finishIntegrations(page));
  await test.step("open default dashboard", () => expectDefaultDashboard(page));

  expect(calls.user).toMatchObject(onboardingData.user);
  expect(calls.coreConfig).toMatchObject({
    type: "config/core/update",
    latitude: onboardingData.location.latitude,
    longitude: onboardingData.location.longitude,
    elevation: onboardingData.location.elevation,
    unit_system: onboardingData.location.unitSystem,
    time_zone: onboardingData.location.timeZone,
    currency: onboardingData.location.currency,
    country: onboardingData.location.country,
  });
  expect(calls.coreConfigCompleted).toBe(true);
  expect(calls.analyticsPreferences).toMatchObject({
    type: "analytics/preferences",
    preferences: {},
  });
  expect(calls.analyticsCompleted).toBe(true);
  expect(calls.systemData).toMatchObject({
    type: "frontend/set_system_data",
    key: "core",
    value: {
      onboarded_version: demoConfig.version,
      onboarded_date: expect.any(String),
    },
  });
  expect(calls.integration).toMatchObject({
    client_id: expect.any(String),
    redirect_uri: expect.stringContaining("/dashboard.html?auth_callback=1"),
  });
  expect(calls.tokenRequests).toHaveLength(2);
  expect(calls.tokenRequests[1]).toContain("dashboard-auth-code");
  expectNoPageErrors(errors);
});

test("chooses analytics consent using named switches", async ({
  page,
  baseURL,
}) => {
  const errors = trackPageErrors(page);
  const calls = await setupOnboardingMocks(page);

  await openOnboarding(page, baseURL!);
  await createOwner(page);
  await completeCoreConfig(page);

  const analytics = page.locator("onboarding-analytics");
  const basic = analytics.getByRole("switch", {
    name: "Basic analytics",
    exact: true,
  });
  const usage = analytics.getByRole("switch", { name: "Usage", exact: true });
  const statistics = analytics.getByRole("switch", {
    name: "Statistical data",
    exact: true,
  });
  const diagnostics = analytics.getByRole("switch", {
    name: "Diagnostics",
    exact: true,
  });

  await expect(basic).toBeVisible();
  await basic.press("Space");
  await usage.press("Space");
  await statistics.press("Space");
  await diagnostics.press("Space");
  await expect(usage).toBeChecked();
  await expect(statistics).toBeChecked();
  await expect(diagnostics).toBeChecked();

  // Withdrawing basic consent also withdraws its dependent categories,
  // while independently selected crash reporting stays enabled.
  await basic.press("Space");
  await expect(usage).not.toBeChecked();
  await expect(statistics).not.toBeChecked();
  await expect(diagnostics).toBeChecked();
  await completeAnalytics(page);
  await expect.poll(() => calls.analyticsCompleted).toBe(true);

  expect(calls.analyticsPreferences).toMatchObject({
    type: "analytics/preferences",
    preferences: {
      base: false,
      usage: false,
      statistics: false,
      diagnostics: true,
    },
  });
  expectNoPageErrors(errors);
});
