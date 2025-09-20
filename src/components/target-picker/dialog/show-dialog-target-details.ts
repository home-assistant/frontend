import { fireEvent } from "../../../common/dom/fire_event";
import type { HaDevicePickerDeviceFilterFunc } from "../../device/ha-device-picker";
import type { HaEntityPickerEntityFilterFunc } from "../../entity/ha-entity-picker";
import type { TargetType } from "../ha-target-picker-item-row";

export type NewBackupType = "automatic" | "manual";

export interface TargetDetailsDialogParams {
  title: string;
  type: TargetType;
  itemId: string;
  deviceFilter?: HaDevicePickerDeviceFilterFunc;
  entityFilter?: HaEntityPickerEntityFilterFunc;
  includeDomains?: string[];
  includeDeviceClasses?: string[];
}

export const loadTargetDetailsDialog = () => import("./dialog-target-details");

export const showTargetDetailsDialog = (
  element: HTMLElement,
  params: TargetDetailsDialogParams
) =>
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-target-details",
    dialogImport: loadTargetDetailsDialog,
    dialogParams: params,
  });
