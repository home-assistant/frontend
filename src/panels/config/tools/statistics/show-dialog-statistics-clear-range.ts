import { fireEvent } from "../../../../common/dom/fire_event";
import type { StatisticsMetaData } from "../../../../data/recorder";

export const loadClearRangeDialog = () =>
  import("./dialog-statistics-clear-range");

export interface DialogStatisticsClearRangeParams {
  statistic: StatisticsMetaData;
  name: string;
}

export const showStatisticsClearRangeDialog = (
  element: HTMLElement,
  dialogParams: DialogStatisticsClearRangeParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-statistics-clear-range",
    dialogImport: loadClearRangeDialog,
    dialogParams,
  });
};
