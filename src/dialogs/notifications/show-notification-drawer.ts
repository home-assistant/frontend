import { fireEvent } from "../../common/dom/fire_event";

export interface NotificationDrawerParams {
  narrow: boolean;
}

export const showNotificationDrawer = (
  element: HTMLElement,
  dialogParams: NotificationDrawerParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "notification-drawer",
    dialogImport: () => import("./notification-drawer"),
    dialogParams,
  });
};
