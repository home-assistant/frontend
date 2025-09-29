import type { HassServiceTarget } from "home-assistant-js-websocket";
import { fireEvent } from "../../../common/dom/fire_event";
import type { HaEntityPickerEntityFilterFunc } from "../../../data/entity";
import type { HaDevicePickerDeviceFilterFunc } from "../../device/ha-device-picker";
import type { TargetType } from "../ha-target-picker-item-row";
import type { TargetTypeFloorless } from "../ha-target-picker-selector";

export interface TargetPickerDialogParams {
  target?: HassServiceTarget;
  deviceFilter?: HaDevicePickerDeviceFilterFunc;
  entityFilter?: HaEntityPickerEntityFilterFunc;
  includeDomains?: string[];
  includeDeviceClasses?: string[];
  typeFilter?: TargetTypeFloorless[];
  updateTypeFilter?: (types: TargetTypeFloorless[]) => void;
  selectTarget: (ev: CustomEvent<{ type: TargetType; id: string }>) => void;
}

export const loadTargetPickerDialog = () => import("./dialog-target-picker");

export const showTargetPickerDialog = (
  element: HTMLElement,
  params: TargetPickerDialogParams
) =>
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-target-picker",
    dialogImport: loadTargetPickerDialog,
    dialogParams: params,
  });
