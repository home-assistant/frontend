import { showToast } from "./toast";
import { HomeAssistant } from "../types";

export const showSaveSuccessToast = (el: HTMLElement, hass: HomeAssistant) =>
  showToast(el, {
    message: hass!.localize("ui.common.successfully_saved"),
  });
