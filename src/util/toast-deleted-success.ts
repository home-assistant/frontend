import { showToast } from "./toast";
import { HomeAssistant } from "../types";

export const showDeleteSuccessToast = (
  el: HTMLElement,
  hass: HomeAssistant,
  action: () => void
) =>
  showToast(el, {
    message: hass!.localize("ui.common.successfully_deleted"),
    action: {
      text: "Undo",
      action,
    },
  });
