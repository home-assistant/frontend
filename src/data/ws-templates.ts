import { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";

export interface RenderTemplateResult {
  result: string;
  listeners: TemplateListeners;
}

interface TemplateListeners {
  all: boolean;
  domains: string[];
  entities: string[];
}

export const subscribeRenderTemplate = (
  conn: Connection,
  onChange: (result: RenderTemplateResult) => void,
  params: {
    template: string;
    entity_ids?: string | string[];
    variables?: object;
    timeout?: number;
  }
): Promise<UnsubscribeFunc> => {
  return conn.subscribeMessage((msg: RenderTemplateResult) => onChange(msg), {
    type: "render_template",
    ...params,
  });
};
