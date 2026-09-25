import { fireEvent } from "../../../common/dom/fire_event";
import type { ConfigEntry } from "../../../data/config_entries";

export interface PickConfigEntryDialogParams {
  domain: string;
  subFlowType: string;
  configEntries: ConfigEntry[];
  configEntryPicked: (configEntry: ConfigEntry) => void;
}

export const showPickConfigEntryDialog = (
  element: HTMLElement,
  dialogParams?: PickConfigEntryDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-pick-config-entry",
    dialogImport: () => import("./dialog-pick-config-entry"),
    dialogParams: dialogParams,
  });
};
