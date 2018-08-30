import { createCollection, getUser } from "home-assistant-js-websocket";

export const subscribeUser = (conn, onChange) =>
  createCollection(
    "_usr",
    conn => getUser(conn),
    null,
    conn,
    onChange
  );
