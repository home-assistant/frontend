import { createCollection } from "home-assistant-js-websocket";

export interface Panel {
  component_name: string;
  config?: any;
  icon?: string;
  title?: string;
  url_path: string;
}

export interface Panels {
  [name: string]: Panel;
}

export const subscribePanels = (conn, onChange) =>
  createCollection<Panels>(
    "_pnl",
    () => conn.sendMessagePromise({ type: "get_panels" }),
    undefined,
    conn,
    onChange
  );
