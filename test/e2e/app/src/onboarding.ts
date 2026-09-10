import { expect, type Page, type WebSocketRoute } from "@playwright/test";
import { demoConfig } from "../../../../src/fake_data/demo_config";
import { demoPanels } from "../../../../src/fake_data/demo_panels";
import { PANEL_TIMEOUT, SHELL_TIMEOUT } from "../../helpers";

interface WebSocketMessage {
  id?: number;
  type: string;
  [key: string]: unknown;
}

export interface OnboardingCalls {
  user?: Record<string, unknown>;
  coreConfig?: Record<string, unknown>;
  coreConfigCompleted?: boolean;
  analyticsPreferences?: Record<string, unknown>;
  analyticsCompleted?: boolean;
  systemData?: Record<string, unknown>;
  integration?: Record<string, unknown>;
  tokenRequests: string[];
}

export const onboardingData = {
  user: {
    name: "Test Owner",
    username: "test-owner",
    password: "test-password",
    language: "en",
  },
  location: {
    latitude: 52.3731,
    longitude: 4.8903,
    elevation: 2,
    country: "NL",
    currency: "EUR",
    timeZone: "Europe/Amsterdam",
    unitSystem: "metric",
  },
} as const;

const onboardingSteps = [
  { step: "user", done: false },
  { step: "core_config", done: false },
  { step: "analytics", done: false },
  { step: "integration", done: false },
];

const currentUser = {
  credentials: [],
  id: "onboarding-owner",
  is_admin: true,
  is_owner: true,
  mfa_modules: [],
  name: onboardingData.user.name,
};

const subscriptionResults: Record<string, unknown> = {
  "config_entries/flow/subscribe": [],
  "config_entries/subscribe": [],
  "frontend/subscribe_system_data": { value: null },
  "frontend/subscribe_user_data": { value: { default_panel: "lovelace" } },
  "labs/subscribe": { enabled: false },
  "persistent_notification/subscribe": {
    type: "current",
    notifications: {},
  },
  subscribe_entities: { a: {} },
};

const commandResults: Record<string, unknown> = {
  analytics: { preferences: {} },
  "analytics/preferences": {},
  "auth/current_user": currentUser,
  "brands/access_token": { token: "brands-token" },
  "config/area_registry/list": [],
  "config/core/update": demoConfig,
  "config/device_registry/list": [],
  "config/entity_registry/list_for_display": {
    entities: [],
    entity_categories: {},
  },
  "config/floor_registry/list": [],
  "frontend/get_translations": { resources: {} },
  "frontend/get_themes": {
    default_theme: "default",
    default_dark_theme: null,
    themes: {},
  },
  "frontend/set_system_data": undefined,
  get_config: demoConfig,
  get_panels: { lovelace: demoPanels.lovelace },
  get_services: {},
  "lovelace/config": {
    views: [
      {
        title: "Home",
        cards: [{ type: "heading", heading: "Onboarding complete" }],
      },
    ],
  },
  "lovelace/info": { resource_mode: "storage" },
  "lovelace/resources": [],
  "recorder/info": {
    migration_in_progress: false,
    migration_is_live: false,
  },
  "repairs/list_issues": { issues: [] },
  supported_features: undefined,
};

const sendResult = (socket: WebSocketRoute, id: number, result: unknown) => {
  socket.send(
    JSON.stringify({
      id,
      type: "result",
      success: true,
      result: result ?? null,
    })
  );
};

const handleWebSocketMessage = (
  socket: WebSocketRoute,
  rawMessage: string | Buffer,
  calls: OnboardingCalls
) => {
  const message = JSON.parse(rawMessage.toString()) as WebSocketMessage;

  if (message.type === "auth") {
    socket.send(JSON.stringify({ type: "auth_ok", ha_version: "2026.8.0" }));
    return;
  }

  if (message.id === undefined) {
    throw new Error(`WebSocket command ${message.type} has no id`);
  }

  if (message.type === "config/core/update") {
    calls.coreConfig = message;
  } else if (message.type === "analytics/preferences") {
    calls.analyticsPreferences = message;
  } else if (message.type === "frontend/set_system_data") {
    calls.systemData = message;
  }

  if (message.type === "subscribe_events") {
    sendResult(socket, message.id, null);
    return;
  }
  if (message.type === "unsubscribe_events") {
    sendResult(socket, message.id, null);
    return;
  }

  if (message.type in subscriptionResults) {
    sendResult(socket, message.id, null);
    socket.send(
      JSON.stringify({
        id: message.id,
        type: "event",
        event: subscriptionResults[message.type],
      })
    );
    return;
  }

  if (message.type in commandResults) {
    sendResult(socket, message.id, commandResults[message.type]);
    return;
  }

  throw new Error(`Unmocked onboarding WebSocket command: ${message.type}`);
};

export async function setupOnboardingMocks(
  page: Page
): Promise<OnboardingCalls> {
  const calls: OnboardingCalls = { tokenRequests: [] };

  // The location step shows a map. This app builds with __DEMO__ true, so its
  // tiles come from the demo upstreams; answering those here keeps CI off the
  // live servers.
  await Promise.all(
    [
      "https://vector.openstreetmap.org/**",
      "https://tiles.versatiles.org/**",
      "https://tile.openstreetmap.org/**",
    ].map((upstream) =>
      page.route(upstream, (route) => route.fulfill({ status: 404, body: "" }))
    )
  );

  await page.route("**/api/onboarding**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === "/api/onboarding") {
      await route.fulfill({ json: onboardingSteps });
      return;
    }
    if (pathname === "/api/onboarding/installation_type") {
      await route.fulfill({
        json: { installation_type: "Home Assistant Container" },
      });
      return;
    }
    if (pathname === "/api/onboarding/users") {
      calls.user = request.postDataJSON() as Record<string, unknown>;
      await route.fulfill({ json: { auth_code: "onboarding-auth-code" } });
      return;
    }
    if (pathname === "/api/onboarding/core_config") {
      calls.coreConfigCompleted = true;
      await route.fulfill({ json: {} });
      return;
    }
    if (pathname === "/api/onboarding/analytics") {
      calls.analyticsCompleted = true;
      await route.fulfill({ json: {} });
      return;
    }
    if (pathname === "/api/onboarding/integration") {
      calls.integration = request.postDataJSON() as Record<string, unknown>;
      await route.fulfill({ json: { auth_code: "dashboard-auth-code" } });
      return;
    }

    await route.abort("failed");
  });

  await page.route("**/auth/token", (route) => {
    calls.tokenRequests.push(route.request().postData() ?? "");
    return route.fulfill({
      json: {
        access_token: "access-token",
        expires_in: 1800,
        refresh_token: "refresh-token",
        token_type: "Bearer",
      },
    });
  });
  await page.route("**/auth/revoke", (route) => route.fulfill({ status: 200 }));
  await page.routeWebSocket("**/api/websocket", (socket) => {
    socket.onMessage((message) =>
      handleWebSocketMessage(socket, message, calls)
    );
  });

  return calls;
}

export async function openOnboarding(page: Page, baseURL: string) {
  const origin = new URL(baseURL).origin;
  const state = btoa(
    JSON.stringify({ hassUrl: origin, clientId: `${origin}/` })
  );
  await page.goto(
    `/onboarding.html?client_id=${encodeURIComponent(`${origin}/`)}&redirect_uri=${encodeURIComponent(`${origin}/dashboard.html?auth_callback=1`)}&state=${encodeURIComponent(state)}`
  );
  await expect(page.locator("onboarding-welcome")).toBeAttached({
    timeout: SHELL_TIMEOUT,
  });
}

export async function createOwner(page: Page) {
  await page
    .locator("onboarding-welcome ha-button.start")
    .click({ timeout: SHELL_TIMEOUT });

  const inputs = page.locator("onboarding-create-user ha-input >> input");
  await expect(inputs).toHaveCount(4, { timeout: PANEL_TIMEOUT });
  await inputs.nth(0).fill(onboardingData.user.name);
  await inputs.nth(1).fill(onboardingData.user.username);
  await inputs.nth(2).fill(onboardingData.user.password);
  await inputs.nth(3).fill(onboardingData.user.password);
  await page
    .locator("onboarding-create-user")
    .getByRole("button", { name: "Create account", exact: true })
    .click();
}

export async function completeCoreConfig(page: Page) {
  const location = page.locator("onboarding-location");
  await expect(location).toBeAttached({ timeout: PANEL_TIMEOUT });
  await location.evaluate((element, locationData) => {
    element.dispatchEvent(
      new CustomEvent("value-changed", {
        bubbles: true,
        composed: true,
        detail: {
          value: {
            location: [locationData.latitude, locationData.longitude],
            country: locationData.country,
            elevation: String(locationData.elevation),
            timezone: locationData.timeZone,
            currency: locationData.currency,
          },
        },
      })
    );
  }, onboardingData.location);
}

export async function completeAnalytics(page: Page) {
  const analytics = page.locator("onboarding-analytics");
  await expect(analytics).toBeAttached({ timeout: PANEL_TIMEOUT });
  await analytics.getByRole("button", { name: "Next", exact: true }).click();
}

export async function finishIntegrations(page: Page) {
  const integrations = page.locator("onboarding-integrations");
  await expect(integrations.locator("ha-button")).toBeVisible({
    timeout: PANEL_TIMEOUT,
  });
  await integrations
    .getByRole("button", { name: "Finish", exact: true })
    .click();
}

export async function expectDefaultDashboard(page: Page) {
  await expect(page).toHaveURL(/\/dashboard\.html#\/lovelace$/, {
    timeout: PANEL_TIMEOUT,
  });
  await expect(page.locator("home-assistant")).toBeAttached({
    timeout: SHELL_TIMEOUT,
  });
  await expect(
    page.getByText("Onboarding complete", { exact: true })
  ).toBeVisible({ timeout: PANEL_TIMEOUT });
}
