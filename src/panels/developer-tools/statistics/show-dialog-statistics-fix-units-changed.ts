import { fireEvent } from "../../../common/dom/fire_event";
import { StatisticsValidationResultUnitsChanged } from "../../../data/recorder";

export const loadFixUnitsDialog = () =>
  import("./dialog-statistics-fix-units-changed");

export interface DialogStatisticsUnitsChangedParams {
  issue: StatisticsValidationResultUnitsChanged;
  fixedCallback: () => void;
}

export const showFixStatisticsUnitsChangedDialog = (
  element: HTMLElement,
  detailParams: DialogStatisticsUnitsChangedParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-statistics-fix-units-changed",
    dialogImport: loadFixUnitsDialog,
    dialogParams: detailParams,
  });
};
