import { fireEvent } from "../../../../common/dom/fire_event";
import type { EnergyPreferences } from "../../../../data/energy";

export interface EnergyCustomiseDialogParams {
  preferences: EnergyPreferences;
  // Called after a successful save (e.g. to show a toast on the page).
  saveCallback?: () => void;
}

export const loadEnergyCustomiseDialog = () =>
  import("./dialog-energy-customise");

export const showEnergyCustomiseDialog = (
  element: HTMLElement,
  params: EnergyCustomiseDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-energy-customise",
    dialogImport: loadEnergyCustomiseDialog,
    dialogParams: params,
  });
};
