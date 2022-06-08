import { getConfigEntries } from "../../../../../../data/config_entries";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import { fetchZwaveNodeStatus } from "../../../../../../data/zwave_js";
import type { HomeAssistant } from "../../../../../../types";
import { showZWaveJSHealNodeDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-heal-node";
import { showZWaveJSNodeStatisticsDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-node-statistics";
import { showZWaveJSReinterviewNodeDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-reinterview-node";
import { showZWaveJSRemoveFailedNodeDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-remove-failed-node";
import type { DeviceAction } from "../../../ha-config-device-page";

export const getZwaveDeviceActions = async (
  el: HTMLElement,
  hass: HomeAssistant,
  device: DeviceRegistryEntry
): Promise<DeviceAction[]> => {
  const configEntries = await getConfigEntries(hass, {
    domain: "zwave_js",
  });

  const configEntry = configEntries.find((entry) =>
    device.config_entries.includes(entry.entry_id)
  );

  if (!configEntry) {
    return [];
  }

  const entryId = configEntry.entry_id;

  const node = await fetchZwaveNodeStatus(hass, device.id);

  if (!node || node.is_controller_node) {
    return [];
  }

  return [
    {
      label: hass.localize(
        "ui.panel.config.zwave_js.device_info.device_config"
      ),
      href: `/config/zwave_js/node_config/${device.id}?config_entry=${entryId}`,
    },
    {
      label: hass.localize(
        "ui.panel.config.zwave_js.device_info.reinterview_device"
      ),
      action: () =>
        showZWaveJSReinterviewNodeDialog(el, {
          device_id: device.id,
        }),
    },
    {
      label: hass.localize("ui.panel.config.zwave_js.device_info.heal_node"),
      action: () =>
        showZWaveJSHealNodeDialog(el, {
          device: device,
        }),
    },
    {
      label: hass.localize(
        "ui.panel.config.zwave_js.device_info.remove_failed"
      ),
      action: () =>
        showZWaveJSRemoveFailedNodeDialog(el, {
          device_id: device.id,
        }),
    },
    {
      label: hass.localize(
        "ui.panel.config.zwave_js.device_info.node_statistics"
      ),
      action: () =>
        showZWaveJSNodeStatisticsDialog(el, {
          device: device,
        }),
    },
  ];
};
