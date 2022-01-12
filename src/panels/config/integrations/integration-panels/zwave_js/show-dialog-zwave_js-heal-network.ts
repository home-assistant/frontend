import { fireEvent } from "../../../../../common/dom/fire_event";

export interface ZWaveJSHealNetworkDialogParams {
  entry_id: string;
}

export const loadHealNetworkDialog = () =>
  import("./dialog-zwave_js-heal-network");

export const showZWaveJSHealNetworkDialog = (
  element: HTMLElement,
  healNetworkDialogParams: ZWaveJSHealNetworkDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zwave_js-heal-network",
    dialogImport: loadHealNetworkDialog,
    dialogParams: healNetworkDialogParams,
  });
};
