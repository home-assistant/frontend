import { createCollection } from "home-assistant-js-websocket";

export const subscribePanels = (conn, onChange) =>
  createCollection(
    "_pnl",
    (conn_) => conn_.sendMessagePromise({ type: "get_panels" }),
    null,
    conn,
    onChange
  );
