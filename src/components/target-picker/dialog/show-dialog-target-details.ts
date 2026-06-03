import { fireEvent } from "../../../common/dom/fire_event";
import type { HaEntityPickerEntityFilterFunc } from "../../../data/entity/entity";
import type { TargetSelector } from "../../../data/selector";
import type { TargetType } from "../../../data/target";
import type { HaDevicePickerDeviceFilterFunc } from "../../device/ha-device-picker";

export interface TargetDetailsDialogParams {
  title: string;
  type: TargetType;
  itemId: string;
  selector?: TargetSelector;
  deviceFilter?: HaDevicePickerDeviceFilterFunc;
  entityFilter?: HaEntityPickerEntityFilterFunc;
  includeDomains?: string[];
  includeDeviceClasses?: string[];
  primaryEntitiesOnly?: boolean;
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
