import { fireEvent } from "../common/dom/fire_event";
import { ShowToastParams } from "../managers/notification-manager";

export const showToast = (el: HTMLElement, params: ShowToastParams) =>
  fireEvent(el, "hass-notification", params);
