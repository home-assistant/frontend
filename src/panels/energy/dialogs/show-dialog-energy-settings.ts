import { fireEvent } from "../../../common/dom/fire_event";
import { EnergyPreferences } from "../../../data/energy";
import "./dialog-energy-settings";

export interface EnergySettingsDialogParams {
  savedCallback: () => void;
  preferences?: Partial<EnergyPreferences>;
}

export const showEnergySettingsDialog = (
  element: HTMLElement,
  dialogParams: EnergySettingsDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-energy-settings",
    dialogImport: () => import("./dialog-energy-settings"),
    dialogParams,
  });
};
