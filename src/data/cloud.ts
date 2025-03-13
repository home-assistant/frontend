import type { LitElement } from "lit";
import {
  showAlertDialog,
  showPromptDialog,
} from "../dialogs/generic/show-dialog-box";
import type { EntityDomainFilter } from "../common/entity/entity_domain_filter";
import type { HomeAssistant } from "../types";
import type { LocalizeFunc } from "../common/translations/localize";
import { showCloudAlreadyConnectedDialog } from "../panels/config/cloud/dialog-cloud-already-connected/show-dialog-cloud-already-connected";

type StrictConnectionMode = "disabled" | "guard_page" | "drop_connection";

interface CloudStatusNotLoggedIn {
  logged_in: false;
  cloud: "disconnected" | "connecting" | "connected";
  http_use_ssl: boolean;
}

export interface CertificateInformation {
  common_name: string;
  expire_date: string;
  fingerprint: string;
  alternative_names: string[];
}

export interface CloudPreferences {
  google_enabled: boolean;
  alexa_enabled: boolean;
  remote_enabled: boolean;
  remote_allow_remote_enable: boolean;
  strict_connection: StrictConnectionMode;
  google_secure_devices_pin: string | undefined;
  cloudhooks: Record<string, CloudWebhook>;
  alexa_report_state: boolean;
  google_report_state: boolean;
  tts_default_voice: [string, string];
  cloud_ice_servers_enabled: boolean;
}

export interface CloudStatusLoggedIn {
  logged_in: true;
  cloud: "disconnected" | "connecting" | "connected";
  cloud_last_disconnect_reason: { clean: boolean; reason: string } | null;
  email: string;
  google_registered: boolean;
  google_entities: EntityDomainFilter;
  google_domains: string[];
  alexa_registered: boolean;
  alexa_entities: EntityDomainFilter;
  prefs: CloudPreferences;
  remote_domain: string | undefined;
  remote_connected: boolean;
  remote_certificate: undefined | CertificateInformation;
  remote_certificate_status:
    | null
    | "error"
    | "generating"
    | "loaded"
    | "loading"
    | "ready";
  http_use_ssl: boolean;
  active_subscription: boolean;
}

export type CloudStatus = CloudStatusNotLoggedIn | CloudStatusLoggedIn;

export interface SubscriptionInfo {
  human_description: string;
  provider: string;
  plan_renewal_date?: number;
}

export interface CloudWebhook {
  webhook_id: string;
  cloudhook_id: string;
  cloudhook_url: string;
  managed?: boolean;
}

interface CloudLoginBase {
  hass: HomeAssistant;
  email: string;
  check_connection?: boolean;
}

export interface CloudLoginPassword extends CloudLoginBase {
  password: string;
}

export interface CloudLoginMFA extends CloudLoginBase {
  code: string;
}

export const cloudLogin = ({
  hass,
  ...rest
}: CloudLoginPassword | CloudLoginMFA) =>
  hass.callApi<{ success: boolean; cloud_pipeline?: string }>(
    "POST",
    "cloud/login",
    rest
  );

export const cloudLogout = (hass: HomeAssistant) =>
  hass.callApi("POST", "cloud/logout");

export const cloudForgotPassword = (hass: HomeAssistant, email: string) =>
  hass.callApi("POST", "cloud/forgot_password", {
    email,
  });

export const cloudRegister = (
  hass: HomeAssistant,
  email: string,
  password: string
) =>
  hass.callApi("POST", "cloud/register", {
    email,
    password,
  });

export const cloudResendVerification = (hass: HomeAssistant, email: string) =>
  hass.callApi("POST", "cloud/resend_confirm", {
    email,
  });

export const fetchCloudStatus = (hass: HomeAssistant) =>
  hass.callWS<CloudStatus>({ type: "cloud/status" });

export const createCloudhook = (hass: HomeAssistant, webhookId: string) =>
  hass.callWS<CloudWebhook>({
    type: "cloud/cloudhook/create",
    webhook_id: webhookId,
  });

export const deleteCloudhook = (hass: HomeAssistant, webhookId: string) =>
  hass.callWS({
    type: "cloud/cloudhook/delete",
    webhook_id: webhookId,
  });

export const connectCloudRemote = (hass: HomeAssistant) =>
  hass.callWS({
    type: "cloud/remote/connect",
  });

export const disconnectCloudRemote = (hass: HomeAssistant) =>
  hass.callWS({
    type: "cloud/remote/disconnect",
  });

export const fetchCloudSubscriptionInfo = (hass: HomeAssistant) =>
  hass.callWS<SubscriptionInfo>({ type: "cloud/subscription" });

export const updateCloudPref = (
  hass: HomeAssistant,
  prefs: {
    google_enabled?: CloudPreferences["google_enabled"];
    alexa_enabled?: CloudPreferences["alexa_enabled"];
    alexa_report_state?: CloudPreferences["alexa_report_state"];
    google_report_state?: CloudPreferences["google_report_state"];
    google_secure_devices_pin?: CloudPreferences["google_secure_devices_pin"];
    tts_default_voice?: CloudPreferences["tts_default_voice"];
    remote_allow_remote_enable?: CloudPreferences["remote_allow_remote_enable"];
    strict_connection?: CloudPreferences["strict_connection"];
    cloud_ice_servers_enabled?: CloudPreferences["cloud_ice_servers_enabled"];
  }
) =>
  hass.callWS({
    type: "cloud/update_prefs",
    ...prefs,
  });

export const removeCloudData = (hass: HomeAssistant) =>
  hass.callWS({
    type: "cloud/remove_data",
  });

export const updateCloudGoogleEntityConfig = (
  hass: HomeAssistant,
  entity_id: string,
  disable_2fa: boolean
) =>
  hass.callWS({
    type: "cloud/google_assistant/entities/update",
    entity_id,
    disable_2fa,
  });

export const cloudSyncGoogleAssistant = (hass: HomeAssistant) =>
  hass.callApi("POST", "cloud/google_actions/sync");

export const fetchSupportPackage = (hass: HomeAssistant) =>
  hass.callApi<string>("GET", "cloud/support_package");

export type LoginFunction = (
  email: string,
  password: string,
  checkConnection: boolean,
  code?: string
) => void;

export const handleCloudLoginError = async (
  err: any,
  element: LitElement,
  email: string,
  password: string,
  checkConnection: boolean,
  localize: LocalizeFunc,
  loginFunction: LoginFunction,
  translationKeyPanel:
    | "page-onboarding.restore.ha-cloud"
    | "config.cloud" = "config.cloud"
): Promise<"cancel" | "password-change" | "re-login" | string> => {
  const errCode = err && err.body && err.body.code;
  if (errCode === "mfarequired") {
    const totpCode = await showPromptDialog(element, {
      title: localize(
        `ui.panel.${translationKeyPanel}.login.totp_code_prompt_title`
      ),
      inputLabel: localize(`ui.panel.${translationKeyPanel}.login.totp_code`),
      inputType: "text",
      defaultValue: "",
      confirmText: localize(`ui.panel.${translationKeyPanel}.login.submit`),
      dismissText: localize(`ui.panel.${translationKeyPanel}.login.cancel`),
    });
    if (totpCode !== null && totpCode !== "") {
      await loginFunction(email, password, checkConnection, totpCode);
      return "re-login";
    }
  }
  if (errCode === "alreadyconnectederror") {
    let returnValue;
    showCloudAlreadyConnectedDialog(element, {
      details: JSON.parse(err.body.message),
      logInHereAction: () => {
        loginFunction(email, password, false);
      },
      closeDialog: () => {
        returnValue = "cancel";
      },
    });
    return returnValue;
  }
  if (errCode === "PasswordChangeRequired") {
    showAlertDialog(element, {
      title: localize(
        `ui.panel.${translationKeyPanel}.login.alert_password_change_required`
      ),
    });
    return "password-change";
  }
  if (errCode === "usernotfound" && email !== email.toLowerCase()) {
    await loginFunction(email.toLowerCase(), password, checkConnection);
    return "re-login";
  }

  switch (errCode) {
    case "UserNotConfirmed":
      return localize(
        `ui.panel.${translationKeyPanel}.login.alert_email_confirm_necessary`
      );
    case "mfarequired":
      return localize(
        `ui.panel.${translationKeyPanel}.login.alert_mfa_code_required`
      );
    case "mfaexpiredornotstarted":
      return localize(
        `ui.panel.${translationKeyPanel}.login.alert_mfa_expired_or_not_started`
      );
    case "invalidtotpcode":
      return localize(
        `ui.panel.${translationKeyPanel}.login.alert_totp_code_invalid`
      );
    default:
      return err && err.body && err.body.message
        ? err.body.message
        : "Unknown error";
  }
};
