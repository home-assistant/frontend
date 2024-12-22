import { PersistentNotificationMessage } from "../../../src/data/persistent_notification";
import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockPersistentNotification = (hass: MockHomeAssistant) => {
  hass.mockWS("persistent_notification/subscribe", (_msg, _hass, onChange) => {
    onChange!({
      type: "added",
      notifications: {
        "demo-1": {
          created_at: new Date().toISOString(),
          message: "There was motion detected in the backyard.",
          notification_id: "demo-1",
          title: "Motion Detected!",
          status: "unread",
        },
      },
    } as PersistentNotificationMessage);
    return () => {};
  });
};
