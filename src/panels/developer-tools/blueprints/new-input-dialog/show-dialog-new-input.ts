import { fireEvent } from "../../../../common/dom/fire_event";

export interface ShowDialogNewInputParams {
  onSubmit: (id: string, type: "input" | "section") => void;
}

export const loadNewInputDialog = () => import("./dialog-new-input");

export const showNewInputDialog = (
  element: HTMLElement,
  dialogParams: ShowDialogNewInputParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-new-input",
    dialogImport: loadNewInputDialog,
    dialogParams,
  });
};
