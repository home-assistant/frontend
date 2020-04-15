import {
  Connection,
  createCollection,
  HassEntity,
} from "home-assistant-js-websocket";

export interface PersitentNotificationEntity extends HassEntity {
  notification_id?: string;
  created_at?: string;
  title?: string;
  message?: string;
}

export interface PersistentNotification {
  created_at: string;
  message: string;
  notification_id: string;
  title: string;
  status: "read" | "unread";
}

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
  onChange: (notifications: PersistentNotification[]) => void
) =>
  createCollection<PersistentNotification[]>(
    "_ntf",
    fetchNotifications,
    subscribeUpdates,
    conn,
    onChange
  );
