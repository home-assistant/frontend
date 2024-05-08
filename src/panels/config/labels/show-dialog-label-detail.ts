import { fireEvent } from "../../../common/dom/fire_event";
import {
  LabelRegistryEntry,
  LabelRegistryEntryMutableParams,
} from "../../../data/label_registry";

export interface LabelDetailDialogParams {
  entry?: LabelRegistryEntry;
  suggestedName?: string;
  createEntry?: (
    values: LabelRegistryEntryMutableParams,
    labelId?: string
  ) => Promise<LabelRegistryEntry>;
  updateEntry?: (
    updates: Partial<LabelRegistryEntryMutableParams>
  ) => Promise<LabelRegistryEntry>;
  removeEntry?: () => Promise<boolean>;
}

export const loadLabelDetailDialog = () => import("./dialog-label-detail");

export const showLabelDetailDialog = (
  element: HTMLElement,
  dialogParams: LabelDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-label-detail",
    dialogImport: loadLabelDetailDialog,
    dialogParams,
  });
};
