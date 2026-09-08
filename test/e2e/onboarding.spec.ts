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
