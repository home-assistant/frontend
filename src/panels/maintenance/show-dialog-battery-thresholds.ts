import { fireEvent } from "../../common/dom/fire_event";
import type { HomeAssistant } from "../../types";

export interface BatteryThresholdsDialogParams {
  hass: HomeAssistant;
}

export const showBatteryThresholdsDialog = (
  element: HTMLElement,
  params: BatteryThresholdsDialogParams
) =>
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-battery-thresholds",
    dialogImport: () => import("./dialog-battery-thresholds"),
    dialogParams: params,
  });
