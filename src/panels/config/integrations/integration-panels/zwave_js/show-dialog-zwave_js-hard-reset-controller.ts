import { fireEvent } from "../../../../../common/dom/fire_event";

export interface ZWaveJSHardResetControllerDialogParams {
  entryId: string;
}

export const loadHardResetControllerDialog = () =>
  import("./dialog-zwave_js-hard-reset-controller");

export const showZWaveJSHardResetControllerDialog = (
  element: HTMLElement,
  hardResetControllerDialogParams: ZWaveJSHardResetControllerDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zwave_js-hard-reset-controller",
    dialogImport: loadHardResetControllerDialog,
    dialogParams: hardResetControllerDialogParams,
  });
};
