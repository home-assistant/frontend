import { showToast } from "./toast";
import { HomeAssistant } from "../types";
import { ShowToastParams } from "../managers/notification-manager";

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
