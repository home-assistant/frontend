import { showToast } from "./toast";
import { HomeAssistant } from "../types";

export const showDeleteSuccessToast = (el: HTMLElement, hass: HomeAssistant) =>
  showToast(el, {
    message: hass!.localize("ui.common.successfully_deleted"),
  });
