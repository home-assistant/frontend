import { fireEvent } from "../../common/dom/fire_event";

export interface BatteryThresholdsDialogParams {
  entityIds: string[];
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
