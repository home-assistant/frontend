import { fireEvent } from "../../../common/dom/fire_event";
import { StatisticsValidationResultUnsupportedUnitMetadata } from "../../../data/history";

export const loadFixUnsupportedUnitMetaDialog = () =>
  import("./dialog-statistics-fix-unsupported-unit-meta");

export interface DialogStatisticsUnsupportedUnitMetaParams {
  issue: StatisticsValidationResultUnsupportedUnitMetadata;
  fixedCallback: () => void;
}

export const showFixStatisticsUnsupportedUnitMetadataDialog = (
  element: HTMLElement,
  detailParams: DialogStatisticsUnsupportedUnitMetaParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-statistics-fix-unsupported-unit-meta",
    dialogImport: loadFixUnsupportedUnitMetaDialog,
    dialogParams: detailParams,
  });
};
