import { fireEvent } from "../../../common/dom/fire_event";
import type { HaEntityPickerEntityFilterFunc } from "../../../data/entity";
import type { TargetType } from "../../../data/target";
import type { HaDevicePickerDeviceFilterFunc } from "../../device/ha-device-picker";

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
