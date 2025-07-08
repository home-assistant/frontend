import { fireEvent } from "../../../common/dom/fire_event";

export interface GroupToggleDialogParams {
  title: string;
  subtitle?: string;
  entityIds: string[];
}

export const showGroupControlDialog = (
  element: HTMLElement,
  dialogParams: GroupToggleDialogParams
) => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-group-toggle",
    dialogImport: () => import("./hui-dialog-group-toggle"),
    dialogParams: dialogParams,
  });
};
