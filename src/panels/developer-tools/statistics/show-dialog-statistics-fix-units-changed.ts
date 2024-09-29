import { fireEvent } from "../../../common/dom/fire_event";
import { StatisticsValidationResultUnitsChanged } from "../../../data/recorder";

export const loadFixUnitsDialog = () =>
  import("./dialog-statistics-fix-units-changed");

export interface DialogStatisticsUnitsChangedParams {
  issue: StatisticsValidationResultUnitsChanged;
  fixedCallback?: () => void;
  cancelCallback?: () => void;
}

export const showFixStatisticsUnitsChangedDialog = (
  element: HTMLElement,
  detailParams: DialogStatisticsUnitsChangedParams
) =>
  new Promise((resolve) => {
    const origCallback = detailParams.fixedCallback;

    fireEvent(element, "show-dialog", {
      dialogTag: "dialog-statistics-fix-units-changed",
      dialogImport: loadFixUnitsDialog,
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
