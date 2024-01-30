import { mdiChatQuestion } from "@mdi/js";
import { getConfigEntries } from "../../../../../../data/config_entries";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import { getMatterNodeDiagnostics } from "../../../../../../data/matter";
import type { HomeAssistant } from "../../../../../../types";
import { showMatterReinterviewNodeDialog } from "../../../../integrations/integration-panels/matter/show-dialog-matter-reinterview-node";
import { showMatterPingNodeDialog } from "../../../../integrations/integration-panels/matter/show-dialog-matter-ping-node";
import { showMatterOpenCommissioningWindowDialog } from "../../../../integrations/integration-panels/matter/show-dialog-matter-open-commissioning-window";
import type { DeviceAction } from "../../../ha-config-device-page";

export const getMatterDeviceActions = async (
  el: HTMLElement,
  hass: HomeAssistant,
  device: DeviceRegistryEntry
): Promise<DeviceAction[]> => {
  if (device.via_device_id !== null) {
    // only show device actions for top level nodes (so not bridged)
    return [];
  }

  const configEntries = await getConfigEntries(hass, {
    domain: "matter",
  });

  const configEntry = configEntries.find((entry) =>
    device.config_entries.includes(entry.entry_id)
  );

  if (!configEntry) {
    return [];
  }

  const nodeDiagnostics = await getMatterNodeDiagnostics(hass, device.id);

  const actions: DeviceAction[] = [];

  if (nodeDiagnostics.available) {
    // actions that can only be performed if the device is alive
    actions.push({
      label: hass.localize(
        "ui.panel.config.matter.device_actions.open_commissioning_window"
      ),
      icon: mdiChatQuestion,
      action: () =>
        showMatterOpenCommissioningWindowDialog(el, {
          device_id: device.id,
        }),
    });
    actions.push({
      label: hass.localize(
        "ui.panel.config.matter.device_actions.reinterview_device"
      ),
      icon: mdiChatQuestion,
      action: () =>
        showMatterReinterviewNodeDialog(el, {
          device_id: device.id,
        }),
    });
  }

  actions.push({
    label: hass.localize("ui.panel.config.matter.device_actions.ping_device"),
    icon: mdiChatQuestion,
    action: () =>
      showMatterPingNodeDialog(el, {
        device_id: device.id,
      }),
  });

  return actions;
};
