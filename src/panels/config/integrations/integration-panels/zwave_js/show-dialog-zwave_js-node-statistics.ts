import { fireEvent } from "../../../../../common/dom/fire_event";
import { DeviceRegistryEntry } from "../../../../../data/device_registry";

export interface ZWaveJSNodeStatisticsDialogParams {
  device: DeviceRegistryEntry;
}

export const loadNodeStatisticsDialog = () =>
  import("./dialog-zwave_js-node-statistics");

export const showZWaveJSNodeStatisticsDialog = (
  element: HTMLElement,
  nodeStatisticsDialogParams: ZWaveJSNodeStatisticsDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zwave_js-node-statistics",
    dialogImport: loadNodeStatisticsDialog,
    dialogParams: nodeStatisticsDialogParams,
  });
};
