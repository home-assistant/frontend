import {
  Connection,
  HassEntity,
  UnsubscribeFunc,
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

export interface PersistentNotifications {
  [notificationId: string]: PersistentNotification;
}

export interface PersistentNotificationMessage {
  type: "added" | "removed" | "current" | "updated";
  notifications: PersistentNotifications;
}

export const subscribeNotifications = (
  conn: Connection,
  onChange: (notifications: PersistentNotification[]) => void
): UnsubscribeFunc => {
  const params = {
    type: "persistent_notification/subscribe",
  };
  const stream = new NotificationStream();
  const subscription = conn.subscribeMessage<PersistentNotificationMessage>(
    (message) => onChange(stream.processMessage(message)),
    params
  );
  return () => {
    subscription.then((unsub) => unsub?.());
  };
};

class NotificationStream {
  notifications: PersistentNotifications;

  constructor() {
    this.notifications = {};
  }

  processMessage(
    streamMessage: PersistentNotificationMessage
  ): PersistentNotification[] {
    if (streamMessage.type === "removed") {
      for (const notificationId of Object.keys(streamMessage.notifications)) {
        delete this.notifications[notificationId];
      }
    } else {
      this.notifications = {
        ...this.notifications,
        ...streamMessage.notifications,
      };
    }
    return Object.values(this.notifications);
  }
}
