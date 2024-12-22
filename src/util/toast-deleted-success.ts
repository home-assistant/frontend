import { ShowToastParams } from "../managers/notification-manager";
import { HomeAssistant } from "../types";
import { showToast } from "./toast";

export const showDeleteSuccessToast = (
  el: HTMLElement,
  hass: HomeAssistant,
  action?: () => void
) => {
  const toastParams: ShowToastParams = {
    message: hass!.localize("ui.common.successfully_deleted"),
  };

  if (action) {
    toastParams.action = { action, text: hass!.localize("ui.common.undo") };
  }

  showToast(el, toastParams);
};
