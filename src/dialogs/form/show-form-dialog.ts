import { fireEvent } from "../../common/dom/fire_event";
import type { HaFormSchema } from "../../components/ha-form/types";

export type FormDialogData = Record<string, any>;

export interface FormDialogParams {
  title: string;
  schema: HaFormSchema[];
  data?: FormDialogData;
  submit?: (data?: FormDialogData) => void;
  cancel?: () => void;
  computeLabel?: (schema, data) => string | undefined;
  computeHelper?: (schema) => string | undefined;
  submitText?: string;
  cancelText?: string;
}

export const showFormDialog = (
  element: HTMLElement,
  dialogParams: FormDialogParams
) =>
  new Promise<FormDialogData | null>((resolve) => {
    const origCancel = dialogParams.cancel;
    const origSubmit = dialogParams.submit;

    fireEvent(element, "show-dialog", {
      dialogTag: "dialog-form",
      dialogImport: () => import("./dialog-form"),
      dialogParams: {
        ...dialogParams,
        cancel: () => {
          resolve(null);
          if (origCancel) {
            origCancel();
          }
        },
        submit: (data: FormDialogData) => {
          resolve(data);
          if (origSubmit) {
            origSubmit(data);
          }
        },
      },
    });
  });
