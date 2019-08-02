import { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";

interface RenderTemplateResult {
  result: string;
}

export const subscribeRenderTemplate = (
  conn: Connection,
  template: string,
  onChange: (result: string) => void,
  entityIDs?: string | string[],
  variables?: object
): Promise<UnsubscribeFunc> => {
  return conn.subscribeMessage(
    (msg: RenderTemplateResult) => onChange(msg.result),
    {
      type: "render_template",
      template,
      entityIDs,
      variables,
    }
  );
};
