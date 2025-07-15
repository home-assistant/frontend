import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../types";

const HAS_CUSTOM_PREVIEW = ["generic_camera", "template"];

export interface GenericPreview {
  state: string;
  attributes: Record<string, any>;
  error?: string;
}

export const subscribePreviewGeneric = (
  hass: HomeAssistant,
  domain: string,
  flow_id: string,
  flow_type: "config_flow" | "options_flow" | "config_subentries_flow",
  user_input: Record<string, any>,
  callback: (preview: GenericPreview) => void
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage(callback, {
    type: `${domain}/start_preview`,
    flow_id,
    flow_type,
    user_input,
  });

export const previewModule = (domain: string): string =>
  HAS_CUSTOM_PREVIEW.includes(domain) ? domain : "generic";
