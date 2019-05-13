import { ShowToastParams } from "../managers/notification-manager";

import { fireEvent } from "../common/dom/fire_event";

export const showToast = (el: HTMLElement, params: ShowToastParams) =>
  fireEvent(el, "hass-notification", params);
