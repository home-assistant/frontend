import { fireEvent } from "../../../common/dom/fire_event";
import {
  AreaRegistryEntry,
  AreaRegistryEntryMutableParams,
} from "../../../data/area_registry";

export interface AreaRegistryDetailDialogParams {
  entry?: AreaRegistryEntry;
  createEntry?: (values: AreaRegistryEntryMutableParams) => Promise<unknown>;
  updateEntry?: (
    updates: Partial<AreaRegistryEntryMutableParams>
  ) => Promise<unknown>;
}

export const loadAreaRegistryDetailDialog = () =>
  import("./dialog-area-registry-detail");

export const showAreaRegistryDetailDialog = (
  element: HTMLElement,
  systemLogDetailParams: AreaRegistryDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-area-registry-detail",
    dialogImport: loadAreaRegistryDetailDialog,
    dialogParams: systemLogDetailParams,
  });
};
