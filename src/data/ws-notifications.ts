import { createCollection, Connection } from "home-assistant-js-websocket";

const fetchNotifications = (conn) =>
  conn.sendMessagePromise({
    type: "persistent_notification/get",
  });

const subscribeUpdates = (conn, store) =>
  conn.subscribeEvents(
    () => fetchNotifications(conn).then((ntf) => store.setState(ntf, true)),
    "persistent_notifications_updated"
  );

export const subscribeNotifications = (
  conn: Connection,
  onChange: (notifications: Notification[]) => void
) =>
  createCollection<Notification[]>(
    "_ntf",
    fetchNotifications,
    subscribeUpdates,
    conn,
    onChange
  );
