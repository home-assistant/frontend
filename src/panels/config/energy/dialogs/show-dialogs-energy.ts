import { fireEvent } from "../../../../common/dom/fire_event";
import type { EnergyEditorConfig } from "../editors/energy-editor";

export interface EnergySettingsDialogParams {
  editor: EnergyEditorConfig;
}

export const showEnergySettingsDialog = (
  element: HTMLElement,
  dialogParams: EnergySettingsDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-energy-settings",
    dialogImport: () => import("./dialog-energy-settings"),
    dialogParams: dialogParams,
  });
};
