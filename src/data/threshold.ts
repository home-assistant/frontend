import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";

export interface ThresholdPreview {
  state: string;
  attributes: Record<string, any>;
}

export const subscribePreviewThreshold = (
  hass: HomeAssistant,
  flow_id: string,
  flow_type: "config_flow" | "options_flow",
  user_input: Record<string, any>,
  callback: (preview: ThresholdPreview) => void
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage(callback, {
    type: "threshold/start_preview",
    flow_id,
    flow_type,
    user_input,
  });
