import { fireEvent } from "../common/dom/fire_event";
import type { ShowToastParams } from "../managers/notification-manager";

export const HOST_ACTION_TOAST_ID = "host-action";

export const showToast = (el: HTMLElement, params: ShowToastParams) =>
  fireEvent(el, "hass-notification", params);
