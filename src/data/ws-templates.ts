import { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";
import { HomeAssistant } from "../types";

export interface RenderTemplateResult {
  result: string;
  listeners: TemplateListeners;
}

interface TemplateListeners {
  all: boolean;
  domains: string[];
  entities: string[];
  time: boolean;
}

export type TemplatePreview = TemplatePreviewState | TemplatePreviewError;

interface TemplatePreviewState {
  state: string;
  attributes: Record<string, any>;
}

interface TemplatePreviewError {
  error: string;
}

export const subscribeRenderTemplate = (
  conn: Connection,
  onChange: (result: RenderTemplateResult) => void,
  params: {
    template: string;
    entity_ids?: string | string[];
    variables?: Record<string, unknown>;
    timeout?: number;
    strict?: boolean;
  }
): Promise<UnsubscribeFunc> =>
  conn.subscribeMessage((msg: RenderTemplateResult) => onChange(msg), {
    type: "render_template",
    ...params,
  });

export const subscribePreviewTemplate = (
  hass: HomeAssistant,
  flow_id: string,
  flow_type: "config_flow" | "options_flow",
  user_input: Record<string, any>,
  callback: (preview: TemplatePreview) => void
): Promise<UnsubscribeFunc> =>
  hass.connection.subscribeMessage(callback, {
    type: "template/start_preview",
    flow_id,
    flow_type,
    user_input,
  });
