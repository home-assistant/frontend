import { expect, test } from "@playwright/test";
import {
  completeAnalytics,
  completeCoreConfig,
  createOwner,
  expectDefaultDashboard,
  finishIntegrations,
  openOnboarding,
  setupOnboardingMocks,
} from "./app/src/onboarding";
import { expectNoPageErrors, trackPageErrors } from "./helpers";

test.use({ serviceWorkers: "block" });

test("completes onboarding and opens the default dashboard", async ({
  page,
}) => {
  const errors = trackPageErrors(page);
  const calls = await setupOnboardingMocks(page);

  await test.step("welcome", () => openOnboarding(page));
  await test.step("create account", () => createOwner(page));
  await test.step("configure Home Assistant", () => completeCoreConfig(page));
  await test.step("choose analytics", () => completeAnalytics(page));
  await test.step("finish integrations", () => finishIntegrations(page));
  await test.step("open default dashboard", () => expectDefaultDashboard(page));

  expect(calls.user).toMatchObject({
    name: "Test Owner",
    username: "test-owner",
    password: "test-password",
    language: "en",
  });
  expect(calls.coreConfig).toMatchObject({
    type: "config/core/update",
    latitude: 52.3731,
    longitude: 4.8903,
    elevation: 2,
    unit_system: "metric",
    time_zone: "Europe/Amsterdam",
    currency: "EUR",
    country: "NL",
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
      onboarded_version: "DEMO",
      onboarded_date: expect.any(String),
    },
  });
  expect(calls.integration).toMatchObject({
    client_id: expect.any(String),
    redirect_uri: expect.stringContaining("/?auth_callback=1"),
  });
  expectNoPageErrors(errors);
});
