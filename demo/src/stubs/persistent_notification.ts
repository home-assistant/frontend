import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { PersistentNotification } from "../../../src/data/persistent_notification";

export const mockPersistentNotification = (hass: MockHomeAssistant) => {
  hass.mockWS("persistent_notification/get", () =>
    Promise.resolve([
      {
        created_at: new Date().toISOString(),
        message: "There was motion detected in the backyard.",
        notification_id: "demo-1",
        title: "Motion Detected!",
        status: "unread",
      },
    ] as PersistentNotification[])
  );
};
