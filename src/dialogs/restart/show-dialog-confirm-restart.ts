import type { TemplateResult } from "lit";
import { fireEvent } from "../../common/dom/fire_event";

export const loadConfirmRestartDialog = () =>
  import("./dialog-confirm-restart");

export interface DialogConfirmRestartParams {
  text: TemplateResult;
  confirmText: string;
  title: string;
}

export interface PrivateDialogConfirmRestartParams extends DialogConfirmRestartParams {
  confirm: () => void;
  cancel: () => void;
}

export const showConfirmRestartDialog = (
  element: HTMLElement,
  detailParams: DialogConfirmRestartParams
) =>
  new Promise<boolean>((resolve) => {
    fireEvent(element, "show-dialog", {
      dialogTag: "dialog-confirm-restart",
      dialogImport: () => import("./dialog-confirm-restart"),
      dialogParams: {
        ...detailParams,
        cancel: () => {
          resolve(false);
        },
        confirm: () => {
          resolve(true);
        },
      },
    });
  });
