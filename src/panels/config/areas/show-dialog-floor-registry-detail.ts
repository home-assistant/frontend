import { fireEvent } from "../../../common/dom/fire_event";
import {
  FloorRegistryEntry,
  FloorRegistryEntryMutableParams,
} from "../../../data/floor_registry";

export interface FloorRegistryDetailDialogParams {
  entry?: FloorRegistryEntry;
  createEntry?: (values: FloorRegistryEntryMutableParams) => Promise<unknown>;
  updateEntry?: (
    updates: Partial<FloorRegistryEntryMutableParams>
  ) => Promise<unknown>;
}

export const loadFloorRegistryDetailDialog = () =>
  import("./dialog-floor-registry-detail");

export const showFloorRegistryDetailDialog = (
  element: HTMLElement,
  systemLogDetailParams: FloorRegistryDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-floor-registry-detail",
    dialogImport: loadFloorRegistryDetailDialog,
    dialogParams: systemLogDetailParams,
  });
};
