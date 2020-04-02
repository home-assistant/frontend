import { showToast } from "./toast";
import { HomeAssistant } from "../types";
import { ToastActionParams } from "../managers/notification-manager";

export const showDeleteSuccessToast = (
  el: HTMLElement,
  hass: HomeAssistant,
  action?: ToastActionParams
) => {
  showToast(el, {
    message: hass!.localize("ui.common.successfully_deleted"),
    action,
  });
};
