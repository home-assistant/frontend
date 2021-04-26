import { fireEvent } from "../../../common/dom/fire_event";
import { Zone, ZoneMutableParams } from "../../../data/zone";

export interface ZoneDetailDialogParams {
  entry?: Zone;
  createEntry: (values: ZoneMutableParams) => Promise<unknown>;
  updateEntry?: (updates: Partial<ZoneMutableParams>) => Promise<unknown>;
  removeEntry?: () => Promise<boolean>;
}

export const loadZoneDetailDialog = () => import("./dialog-zone-detail");

export const showZoneDetailDialog = (
  element: HTMLElement,
  systemLogDetailParams: ZoneDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zone-detail",
    dialogImport: loadZoneDetailDialog,
    dialogParams: systemLogDetailParams,
  });
};
