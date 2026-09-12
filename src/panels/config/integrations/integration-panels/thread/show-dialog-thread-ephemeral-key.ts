import { fireEvent } from "../../../../../common/dom/fire_event";

export interface DialogThreadEphemeralKeyParams {
  extendedAddress: string;
}

export const showThreadEphemeralKeyDialog = (
  element: HTMLElement,
  dialogParams: DialogThreadEphemeralKeyParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-thread-ephemeral-key",
    dialogImport: () => import("./dialog-thread-ephemeral-key"),
    dialogParams,
  });
};
