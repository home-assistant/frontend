import type { HassServiceTarget } from "home-assistant-js-websocket";
import { fireEvent } from "../../../common/dom/fire_event";
import type { HaEntityPickerEntityFilterFunc } from "../../../data/entity/entity";
import type { TargetSelector } from "../../../data/selector";
import type { TargetType } from "../../../data/target";
import type { HaDevicePickerDeviceFilterFunc } from "../../device/ha-device-picker";
import type { TargetExclusion } from "../target-exclusions";

export interface TargetDetailsDialogParams {
  title: string;
  type: TargetType;
  itemId: string;
  selector?: TargetSelector;
  deviceFilter?: HaDevicePickerDeviceFilterFunc;
  entityFilter?: HaEntityPickerEntityFilterFunc;
  activeFilter?: (entityId: string) => boolean;
  includeDomains?: string[];
  includeDeviceClasses?: string[];
  primaryEntitiesOnly?: boolean;
  /** The exclusions that take entities out of this target. */
  exclusions?: TargetExclusion[];
  /**
   * The `exclude` of the target value, to work out `exclusions` from when
   * they aren't given.
   */
  exclude?: HassServiceTarget;
  /**
   * The entities of the other included targets, so an exclusion made here
   * is known to also affect them.
   */
  otherTargetEntities?: string[];
  /**
   * Set to give the rows checkboxes. Called on apply with the exclusions the
   * dialog opened with and the ones it has now.
   */
  exclusionsChanged?: (
    initial: TargetExclusion[],
    current: TargetExclusion[]
  ) => void;
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
