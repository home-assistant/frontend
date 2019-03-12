import { HomeAssistant } from "../types";
import { Webhook } from "./webhook";

export interface EntityFilter {
  include_domains: string[];
  include_entities: string[];
  exclude_domains: string[];
  exclude_entities: string[];
}
interface CloudStatusBase {
  logged_in: boolean;
  cloud: "disconnected" | "connecting" | "connected";
}

interface CertificateInformation {
  common_name: string;
  expire_date: string;
  fingerprint: string;
}

export type CloudStatusLoggedIn = CloudStatusBase & {
  email: string;
  google_entities: EntityFilter;
  google_domains: string[];
  alexa_entities: EntityFilter;
  alexa_domains: string[];
  prefs: {
    google_enabled: boolean;
    alexa_enabled: boolean;
    google_allow_unlock: boolean;
    cloudhooks: { [webhookId: string]: CloudWebhook };
  };
  remote_domain: string | undefined;
  remote_connected: boolean;
  remote_certificate: undefined | CertificateInformation;
};

export type CloudStatus = CloudStatusBase | CloudStatusLoggedIn;

export interface SubscriptionInfo {
  human_description: string;
}

export interface WebhookDialogParams {
  webhook: Webhook;
  cloudhook: CloudWebhook;
  disableHook: () => void;
}

export interface CloudWebhook {
  webhook_id: string;
  cloudhook_id: string;
  cloudhook_url: string;
  managed?: boolean;
}

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
    google_enabled?: boolean;
    alexa_enabled?: boolean;
    google_allow_unlock?: boolean;
  }
) =>
  hass.callWS({
    type: "cloud/update_prefs",
    ...prefs,
  });
