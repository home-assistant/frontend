import { HomeAssistant } from "../types";

export interface Webhook {
  webhook_id: string;
  domain: string;
  name: string;
  local_only: boolean;
}
export interface WebhookError {
  code: number;
  message: string;
}

export const fetchWebhooks = (hass: HomeAssistant): Promise<Webhook[]> =>
  hass.callWS({
    type: "webhook/list",
  });
