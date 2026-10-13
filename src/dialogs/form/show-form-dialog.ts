import { fireEvent } from "../../common/dom/fire_event";
import type { HaFormSchema } from "../../components/ha-form/types";

export type FormDialogData = Record<string, any>;

export interface FormDialogParams {
  title: string;
  schema: HaFormSchema[];
  data?: FormDialogData;
  // Extra submit-time validation beyond the schema's own checks. Returned
  // errors are shown on the named fields ("base" for a general error) and
  // block the submit; they clear when the user edits the form.
  validate?: (data: FormDialogData) => Record<string, string> | undefined;
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
