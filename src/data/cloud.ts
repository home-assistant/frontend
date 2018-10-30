import { HomeAssistant } from "../types";

export interface CloudWebhook {
  webhook_id: string;
  cloud_id: string;
  cloud_url: string;
}

export const enableWebhook = (hass: HomeAssistant, webhookId: string) =>
  hass.callWS<CloudWebhook>({
    type: "cloud/webhook/enable",
    webhook_id: webhookId,
  });

export const disableWebhook = (hass: HomeAssistant, webhookId: string) =>
  hass.callWS({
    type: "cloud/webhook/disable",
    webhook_id: webhookId,
  });
