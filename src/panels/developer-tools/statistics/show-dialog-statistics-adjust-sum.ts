import type { StatisticsMetaData } from "../../../data/recorder";

import { fireEvent } from "../../../common/dom/fire_event";

export const loadAdjustSumDialog = () =>
  import("./dialog-statistics-adjust-sum");

export interface DialogStatisticsAdjustSumParams {
  statistic: StatisticsMetaData;
}

export const showStatisticsAdjustSumDialog = (
  element: HTMLElement,
  detailParams: DialogStatisticsAdjustSumParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-statistics-adjust-sum",
    dialogImport: loadAdjustSumDialog,
    dialogParams: detailParams,
  });
};
