import { fireEvent } from "../../../common/dom/fire_event";
import type { HassioResolution } from "../../../data/hassio/resolution";
import type { SystemHealthInfo } from "../../../data/system_health";

export interface SystemInformationDialogParams {
  systemInfo?: SystemHealthInfo;
  resolutionInfo?: HassioResolution;
}

export const loadSystemInformationDialog = () =>
  import("./dialog-system-information");

export const showSystemInformationDialog = (
  element: HTMLElement,
  systemInformationParams: SystemInformationDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-system-information",
    dialogImport: loadSystemInformationDialog,
    dialogParams: systemInformationParams,
  });
};
