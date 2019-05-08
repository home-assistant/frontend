import { handleFetchPromise } from "../util/hass-call-api";
import { HomeAssistant } from "../types";

export interface OnboardingUserStepResponse {
  auth_code: string;
}

export interface OnboardingIntegrationStepResponse {
  auth_code: string;
}

export interface OnboardingResponses {
  user: OnboardingUserStepResponse;
  integration: OnboardingIntegrationStepResponse;
}

export type ValidOnboardingStep = keyof OnboardingResponses;

export interface OnboardingStep {
  step: ValidOnboardingStep;
  done: boolean;
}

export const fetchOnboardingOverview = () =>
  fetch("/api/onboarding", { credentials: "same-origin" });

export const onboardUserStep = (params: {
  client_id: string;
  name: string;
  username: string;
  password: string;
  language: string;
}) =>
  handleFetchPromise<OnboardingUserStepResponse>(
    fetch("/api/onboarding/users", {
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify(params),
    })
  );

export const onboardIntegrationStep = (
  hass: HomeAssistant,
  params: { client_id: string }
) =>
  hass.callApi<OnboardingIntegrationStepResponse>(
    "POST",
    "onboarding/integration",
    params
  );
