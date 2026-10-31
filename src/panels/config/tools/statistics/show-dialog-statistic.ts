import { fireEvent } from "../../../../common/dom/fire_event";
import type {
  StatisticsMetaData,
  StatisticsValidationResult,
} from "../../../../data/recorder";

export const loadStatisticDialog = () => import("./dialog-statistic");

export interface DialogStatisticParams {
  statistic: StatisticsMetaData;
  name: string;
  area?: string;
  device?: string;
  issues?: StatisticsValidationResult[];
  issueFixedCallback?: () => void;
}

export const showStatisticDialog = (
  element: HTMLElement,
  dialogParams: DialogStatisticParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-statistic",
    dialogImport: loadStatisticDialog,
    dialogParams,
  });
};
