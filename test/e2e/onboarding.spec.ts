import { expect, test, type Page } from "@playwright/test";
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
  await test.step("finish integrations", async () => {
    await expect(page.locator("onboarding-integrations")).toBeAttached();
    await finishIntegrations(page);
  });
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

test("preserves empty client state through onboarding", async ({
  page,
  baseURL,
}) => {
  const errors = trackPageErrors(page);
  const calls = await setupOnboardingMocks(page);
  const redirectUri = "https://client.example/oauth/callback";
  const authorizationParams = {
    client_id: "https://client.example/oauth/client-metadata.json",
    redirect_uri: redirectUri,
    state: "",
  };
  await page.route("https://client.example/oauth/callback?**", (route) =>
    route.fulfill({ contentType: "text/plain", body: "Authorized" })
  );

  await openOnboarding(page, baseURL!, authorizationParams);
  await createOwner(page);
  await completeCoreConfig(page);
  await completeAnalytics(page);

  await finishIntegrations(page);

  await expect(page).toHaveURL(
    `${redirectUri}?code=dashboard-auth-code&state=&storeToken=true`
  );
  expect(calls.integration).toEqual({
    client_id: "https://client.example/oauth/client-metadata.json",
    redirect_uri: redirectUri,
  });
  expect(calls.tokenRequests).toHaveLength(1);
  expectNoPageErrors(errors);
});

for (const { name, resume } of [
  {
    name: "saved tokens",
    resume: (page: Page) => page.reload(),
  },
  {
    name: "an auth callback",
    resume: (page: Page) => {
      const callbackUrl = new URL(page.url());
      const state = btoa(
        JSON.stringify({
          hassUrl: callbackUrl.origin,
          clientId: callbackUrl.origin + "/",
        })
      );
      callbackUrl.searchParams.append("auth_callback", "1");
      callbackUrl.searchParams.append("code", "resume-auth-code");
      callbackUrl.searchParams.append("state", state);
      callbackUrl.searchParams.append("iss", callbackUrl.origin);
      callbackUrl.searchParams.append("storeToken", "true");
      return page.goto(callbackUrl.href);
    },
  },
]) {
  test(
    "preserves the authorization request when resuming onboarding with " + name,
    async ({ page, baseURL }) => {
      const errors = trackPageErrors(page);
      const calls = await setupOnboardingMocks(page);
      const redirectUri = "https://client.example/oauth/callback";
      const state = "client-transaction/with+opaque=state";
      const authorizationParams = {
        client_id: "https://client.example/oauth/client-metadata.json",
        redirect_uri: redirectUri,
        state,
      };
      await page.route("https://client.example/oauth/callback?**", (route) =>
        route.fulfill({ contentType: "text/plain", body: "Authorized" })
      );

      await openOnboarding(page, baseURL!, authorizationParams);
      await createOwner(page);
      await expect(page.locator("onboarding-core-config")).toBeAttached();
      await resume(page);
      await expect(page.locator("onboarding-core-config")).toBeAttached();
      expect(new URL(page.url()).searchParams.get("state")).toBe(state);
      expect(new URL(page.url()).searchParams.has("auth_callback")).toBe(false);
      await completeCoreConfig(page);
      await completeAnalytics(page);

      await finishIntegrations(page);

      const callbackUrl = new URL(redirectUri);
      callbackUrl.searchParams.set("code", "dashboard-auth-code");
      callbackUrl.searchParams.set("state", state);
      callbackUrl.searchParams.set("storeToken", "true");
      await expect(page).toHaveURL(callbackUrl.href);
      expect(calls.integration).toEqual({
        client_id: "https://client.example/oauth/client-metadata.json",
        redirect_uri: redirectUri,
      });
      expectNoPageErrors(errors);
    }
  );
}
