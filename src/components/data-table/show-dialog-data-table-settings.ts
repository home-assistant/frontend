import { fireEvent } from "../../common/dom/fire_event";
import { LocalizeFunc } from "../../common/translations/localize";
import { DataTableColumnContainer } from "./ha-data-table";

export interface DataTableSettingsDialogParams {
  columns: DataTableColumnContainer;
  onUpdate: (
    columnOrder: string[] | undefined,
    hiddenColumns: string[] | undefined
  ) => void;
  hiddenColumns?: string[];
  columnOrder?: string[];
  localizeFunc?: LocalizeFunc;
}

export const loadDataTableSettingsDialog = () =>
  import("./dialog-data-table-settings");

export const showDataTableSettingsDialog = (
  element: HTMLElement,
  dialogParams: DataTableSettingsDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-data-table-settings",
    dialogImport: loadDataTableSettingsDialog,
    dialogParams,
  });
};
