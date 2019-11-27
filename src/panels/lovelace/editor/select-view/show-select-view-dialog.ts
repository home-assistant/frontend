import { fireEvent } from "../../../../common/dom/fire_event";
import { Lovelace } from "../../types";

export interface SelectViewDialogParams {
  lovelace: Lovelace;
  viewSelectedCallback: (view: number) => void;
}

export const showSelectViewDialog = (
  element: HTMLElement,
  selectViewDialogParams: SelectViewDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-select-view",
    dialogImport: () =>
      import(
        /* webpackChunkName: "hui-dialog-select-view" */ "./hui-dialog-select-view"
      ),
    dialogParams: selectViewDialogParams,
  });
};
