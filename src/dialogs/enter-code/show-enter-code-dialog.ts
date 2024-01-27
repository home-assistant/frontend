import { fireEvent } from "../../common/dom/fire_event";

export interface EnterCodeDialogParams {
  codeFormat: "text" | "number";
  codePattern?: string;
  submitText?: string;
  cancelText?: string;
  title?: string;
  submit?: (code?: string) => void;
  cancel?: () => void;
}

export const showEnterCodeDialogDialog = (
  element: HTMLElement,
  dialogParams: EnterCodeDialogParams
) =>
  new Promise<string | null>((resolve) => {
    const origCancel = dialogParams.cancel;
    const origSubmit = dialogParams.submit;

    fireEvent(element, "show-dialog", {
      dialogTag: "dialog-enter-code",
      dialogImport: () => import("./dialog-enter-code"),
      dialogParams: {
        ...dialogParams,
        cancel: () => {
          resolve(null);
          if (origCancel) {
            origCancel();
          }
        },
        submit: (code: string) => {
          resolve(code);
          if (origSubmit) {
            origSubmit(code);
          }
        },
      },
    });
  });
