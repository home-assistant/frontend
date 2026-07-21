import type { Connection } from "home-assistant-js-websocket";
import type {
  CoreFrontendSystemData,
  SurveyInteraction,
} from "../data/frontend";
import { saveFrontendSystemData } from "../data/frontend";
import type { CurrentUser, HomeAssistant } from "../types";
import { showToast } from "./toast";

const SURVEY_MIN_AGE = 5 * 24 * 60 * 60 * 1000; // 5 days
const SURVEY_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 1 month

// Always the production site: the survey is a single page that is not
// version-specific (the version is passed as a query parameter instead), so
// beta/dev installs should not be routed to rc./next. like documentationUrl
// would.
const SURVEY_URL = "https://www.home-assistant.io/surveys/onboarding";

export const shouldShowOnboardingSurvey = (
  user: CurrentUser | undefined,
  systemData: CoreFrontendSystemData | undefined,
  now: number = Date.now()
): boolean => {
  if (!user?.is_owner || !systemData?.onboarded_date) {
    return false;
  }
  if (systemData.surveys?.onboarding) {
    return false;
  }
  const age = now - new Date(systemData.onboarded_date).getTime();
  // NaN (invalid date) and future dates (clock skew) both fail these checks
  return age >= SURVEY_MIN_AGE && age <= SURVEY_MAX_AGE;
};

export const recordOnboardingSurvey = (
  conn: Connection,
  systemData: CoreFrontendSystemData,
  action: SurveyInteraction["action"]
): Promise<void> =>
  // saveFrontendSystemData overwrites the whole "core" object, so spread the
  // existing data to preserve the other fields.
  saveFrontendSystemData(conn, "core", {
    ...systemData,
    surveys: {
      ...systemData.surveys,
      onboarding: { date: new Date().toISOString(), action },
    },
  });

export const getOnboardingSurveyUrl = (
  systemData: CoreFrontendSystemData
): string =>
  systemData.onboarded_version
    ? `${SURVEY_URL}?version=${encodeURIComponent(systemData.onboarded_version)}`
    : SURVEY_URL;

export const checkOnboardingSurveyToast = (
  el: HTMLElement,
  hass: HomeAssistant
) => {
  if (!shouldShowOnboardingSurvey(hass.user, hass.systemData)) {
    return;
  }
  const record = (action: SurveyInteraction["action"]) =>
    recordOnboardingSurvey(hass.connection, hass.systemData!, action);
  showToast(el, {
    id: "onboarding-survey",
    message: {
      translationKey: "ui.notification_toast.onboarding_survey.message",
    },
    duration: -1,
    dismissable: true,
    action: {
      text: {
        translationKey: "ui.notification_toast.onboarding_survey.action",
      },
      action: () => {
        window.open(getOnboardingSurveyUrl(hass.systemData!), "_blank");
        record("opened");
      },
    },
    dismiss: () => record("dismissed"),
  });
};
