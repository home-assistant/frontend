import { handleFetchPromise } from "../util/hass-call-api";

export interface OnboardingStep {
  step: string;
  done: boolean;
}

interface UserStepResponse {
  auth_code: string;
}

export const fetchOnboardingOverview = () =>
  fetch("/api/onboarding", { credentials: "same-origin" });

export const onboardUserStep = (params: {
  client_id: string;
  name: string;
  username: string;
  password: string;
}) =>
  handleFetchPromise<UserStepResponse>(
    fetch("/api/onboarding/users", {
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify(params),
    })
  );
