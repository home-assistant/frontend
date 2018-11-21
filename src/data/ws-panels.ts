import { createCollection, Connection } from "home-assistant-js-websocket";
import { Panels } from "../types";

export const subscribePanels = (
  conn: Connection,
  onChange: (panels: Panels) => void
) =>
  createCollection<Panels>(
    "_pnl",
    () => conn.sendMessagePromise({ type: "get_panels" }),
    undefined,
    conn,
    onChange
  );
