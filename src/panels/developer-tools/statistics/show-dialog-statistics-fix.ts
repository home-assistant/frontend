import { fireEvent } from "../../../common/dom/fire_event";
import type { StatisticsValidationResult } from "../../../data/recorder";

export const loadFixDialog = () => import("./dialog-statistics-fix");

export interface DialogStatisticsFixParams {
  issue: StatisticsValidationResult;
  fixedCallback?: () => void;
  cancelCallback?: () => void;
}

export const showFixStatisticsDialog = (
  element: HTMLElement,
  detailParams: DialogStatisticsFixParams
) =>
  new Promise((resolve) => {
    const origCallback = detailParams.fixedCallback;

    fireEvent(element, "show-dialog", {
      dialogTag: "dialog-statistics-fix",
      dialogImport: loadFixDialog,
      dialogParams: {
        ...detailParams,
        cancelCallback: () => {
          resolve(false);
        },
        fixedCallback: () => {
          resolve(true);
          origCallback?.();
        },
      },
    });
  });
