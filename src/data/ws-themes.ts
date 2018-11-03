import { createCollection } from "home-assistant-js-websocket";

const fetchThemes = (conn) =>
  conn.sendMessagePromise({
    type: "frontend/get_themes",
  });

const subscribeUpdates = (conn, store) =>
  conn.subscribeEvents(
    (event) => store.setState(event.data, true),
    "themes_updated"
  );

export const subscribeThemes = (conn, onChange) =>
  createCollection("_thm", fetchThemes, subscribeUpdates, conn, onChange);
