import type { HomeAssistant } from "../types";
import { handleFetchPromise } from "../util/hass-call-api";

export interface InstallationType {
  installation_type:
    | "Home Assistant Operating System"
    | "Home Assistant Container"
    | "Home Assistant Supervised"
    | "Home Assistant Core"
    | "Unknown";
}

export interface OnboardingCoreConfigStepResponse {}

export interface OnboardingUserStepResponse {
  auth_code: string;
}

export interface OnboardingIntegrationStepResponse {
  auth_code: string;
}

export interface OnboardingAnalyticsStepResponse {}

export interface OnboardingResponses {
  user: OnboardingUserStepResponse;
  core_config: OnboardingCoreConfigStepResponse;
  integration: OnboardingIntegrationStepResponse;
  analytics: OnboardingAnalyticsStepResponse;
}

export type ValidOnboardingStep = keyof OnboardingResponses;

export interface OnboardingStep {
  step: ValidOnboardingStep;
  done: boolean;
}

export const fetchOnboardingOverview = () =>
  fetch(`${__HASS_URL__}/api/onboarding`, { credentials: "same-origin" });

export const onboardUserStep = (params: {
  client_id: string;
  name: string;
  username: string;
  password: string;
  language: string;
}) =>
  handleFetchPromise<OnboardingUserStepResponse>(
    fetch(`${__HASS_URL__}/api/onboarding/users`, {
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify(params),
    })
  );

export const onboardCoreConfigStep = (hass: HomeAssistant) =>
  hass.callApi<OnboardingCoreConfigStepResponse>(
    "POST",
    "onboarding/core_config"
  );

export const onboardAnalyticsStep = (hass: HomeAssistant) =>
  hass.callApi<OnboardingAnalyticsStepResponse>("POST", "onboarding/analytics");

export const onboardIntegrationStep = (
  hass: HomeAssistant,
  params: { client_id: string; redirect_uri: string }
) =>
  hass.callApi<OnboardingIntegrationStepResponse>(
    "POST",
    "onboarding/integration",
    params
  );

export const fetchInstallationType = async (): Promise<InstallationType> => {
  const response = await fetch(
    `${__HASS_URL__}/api/onboarding/installation_type`,
    {
      method: "GET",
    }
  );

  if (response.status === 401) {
    throw Error("unauthorized");
  }

  if (response.status === 404) {
    throw Error("not_found");
  }

  return response.json();
};
