import { fireEvent } from "../../common/dom/fire_event";
import type { AreaFilterValue } from "../../components/ha-area-filter";

export interface AreaFilterDialogParams {
  title?: string;
  initialValue?: AreaFilterValue;
  submit?: (value?: AreaFilterValue) => void;
  cancel?: () => void;
}

export const showAreaFilterDialog = (
  element: HTMLElement,
  dialogParams: AreaFilterDialogParams
) =>
  new Promise<AreaFilterValue | null>((resolve) => {
    const origCancel = dialogParams.cancel;
    const origSubmit = dialogParams.submit;

    fireEvent(element, "show-dialog", {
      dialogTag: "dialog-area-filter",
      dialogImport: () => import("./area-filter-dialog"),
      dialogParams: {
        ...dialogParams,
        cancel: () => {
          resolve(null);
          if (origCancel) {
            origCancel();
          }
        },
        submit: (code: AreaFilterValue) => {
          resolve(code);
          if (origSubmit) {
            origSubmit(code);
          }
        },
      },
    });
  });
