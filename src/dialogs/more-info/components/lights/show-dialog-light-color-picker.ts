import { fireEvent } from "../../../../common/dom/fire_event";

export interface LightColorPickerDialogParams {
  entityId: string;
}

export const loadLightColorPickerDialog = () =>
  import("./dialog-light-color-picker");

export const showLightColorPickerDialog = (
  element: HTMLElement,
  dialogParams: LightColorPickerDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-light-color-picker",
    dialogImport: loadLightColorPickerDialog,
    dialogParams,
  });
};
