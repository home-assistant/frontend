import { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";

export const subscribeOne = async <T>(
  conn: Connection,
  subscribe: (
    conn2: Connection,
    onChange: (items: T) => void
  ) => UnsubscribeFunc
) =>
  new Promise<T>((resolve) => {
    const unsub = subscribe(conn, (items) => {
      unsub();
      resolve(items);
    });
  });
