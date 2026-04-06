import type { LitElement } from "lit";
import { fireEvent } from "../../../../../../common/dom/fire_event";

export interface ZWaveJSRebuildNetworkRoutesDetailDialogParams {
  type: "pending" | "skipped" | "failed" | "done";
  configEntryId: string;
}

export const loadRebuildNetworkRoutesDialog = () =>
  import("./dialog-zwave_js-rebuild-network-routes-detail");

export const showZWaveJSRebuildNetworkRoutesDetailDialog = (
  element: LitElement,
  dialogParams: ZWaveJSRebuildNetworkRoutesDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    parentElement: element,
    dialogTag: "dialog-zwave_js-rebuild-network-routes-detail",
    dialogImport: loadRebuildNetworkRoutesDialog,
    dialogParams,
  });
};
