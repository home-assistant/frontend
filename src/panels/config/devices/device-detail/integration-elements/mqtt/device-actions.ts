import { mdiInformationOutline } from "@mdi/js";
import type { DeviceRegistryEntry } from "../../../../../../data/device/device_registry";
import type { DeviceAction } from "../../../ha-config-device-page";
import { showMQTTDeviceDebugInfoDialog } from "./show-dialog-mqtt-device-debug-info";

export const getMQTTDeviceActions = (
  el: HTMLElement,
  device: DeviceRegistryEntry
): DeviceAction[] => [
  {
    label: "MQTT Info",
    icon: mdiInformationOutline,
    action: async () => showMQTTDeviceDebugInfoDialog(el, { device }),
  },
];
