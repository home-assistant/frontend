import type { Connection } from "home-assistant-js-websocket";
import { createCollection } from "home-assistant-js-websocket";
import type { Panels } from "../types";

const fetchPanels = (conn) =>
  conn.sendMessagePromise({
    type: "get_panels",
  });

const subscribeUpdates = (conn, store) =>
  conn.subscribeEvents(
    () => fetchPanels(conn).then((panels) => store.setState(panels, true)),
    "panels_updated"
  );

export const subscribePanels = (
  conn: Connection,
  onChange: (panels: Panels) => void
) =>
  createCollection<Panels>(
    "_pnl",
    fetchPanels,
    subscribeUpdates,
    conn,
    onChange
  );
