import type { HassServiceTarget } from "home-assistant-js-websocket";
import { fireEvent } from "../../../common/dom/fire_event";
import type { HaDevicePickerDeviceFilterFunc } from "../../device/ha-device-picker";
import type { TargetTypeFloorless } from "../ha-target-picker-selector";
import type { HaEntityPickerEntityFilterFunc } from "../../../data/entity";

export interface TargetPickerDialogParams {
  target: HassServiceTarget;
  deviceFilter?: HaDevicePickerDeviceFilterFunc;
  entityFilter?: HaEntityPickerEntityFilterFunc;
  includeDomains?: string[];
  includeDeviceClasses?: string[];
  typeFilter?: TargetTypeFloorless[];
  updateTypeFilter?: (types: TargetTypeFloorless[]) => void;
  selectTarget: (target: HassServiceTarget) => void;
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
