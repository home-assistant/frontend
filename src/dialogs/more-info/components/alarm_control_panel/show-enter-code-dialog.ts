import { fireEvent } from "../../../../common/dom/fire_event";

export interface EnterCodeDialogParams {
  codeFormat: "text" | "number";
  submit?: (code: string) => void;
  cancel?: () => void;
}

export const showEnterCodeDialogDialog = (
  element: HTMLElement,
  dialogParams: EnterCodeDialogParams
) =>
  new Promise<string>((resolve, reject) => {
    const origCancel = dialogParams.cancel;
    const origSubmit = dialogParams.submit;

    fireEvent(element, "show-dialog", {
      dialogTag: "dialog-enter-code",
      dialogImport: () => import("./dialog-enter-code"),
      dialogParams: {
        ...dialogParams,
        cancel: () => {
          reject();
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
