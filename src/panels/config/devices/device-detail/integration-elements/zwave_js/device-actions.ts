import { getConfigEntries } from "../../../../../../data/config_entries";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import {
  fetchZwaveIsAnyFirmwareUpdateInProgress,
  fetchZwaveNodeFirmwareUpdateCapabilities,
  fetchZwaveNodeIsFirmwareUpdateInProgress,
  fetchZwaveNodeStatus,
} from "../../../../../../data/zwave_js";
import { showConfirmationDialog } from "../../../../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../../../../types";
import { showZWaveJSHealNodeDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-heal-node";
import { showZWaveJSNodeStatisticsDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-node-statistics";
import { showZWaveJSReinterviewNodeDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-reinterview-node";
import { showZWaveJSRemoveFailedNodeDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-remove-failed-node";
import { showZWaveJUpdateFirmwareNodeDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-update-firmware-node";
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

  const nodeStatus = await fetchZwaveNodeStatus(hass, device.id);

  if (!nodeStatus || nodeStatus.is_controller_node) {
    return [];
  }

  const actions = [
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
          device,
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
          device,
        }),
    },
  ];

  if (!nodeStatus.ready) {
    return actions;
  }

  const [
    firmwareUpdateCapabilities,
    isAnyFirmwareUpdateInProgress,
    isNodeFirmwareUpdateInProgress,
  ] = await Promise.all([
    fetchZwaveNodeFirmwareUpdateCapabilities(hass, device.id),
    fetchZwaveIsAnyFirmwareUpdateInProgress(hass, entryId),
    fetchZwaveNodeIsFirmwareUpdateInProgress(hass, device.id),
  ]);

  if (
    firmwareUpdateCapabilities.firmware_upgradable &&
    (!isAnyFirmwareUpdateInProgress || isNodeFirmwareUpdateInProgress)
  ) {
    actions.push({
      label: hass.localize(
        "ui.panel.config.zwave_js.device_info.update_firmware"
      ),
      action: async () => {
        if (
          await showConfirmationDialog(el, {
            text: hass.localize(
              "ui.panel.config.zwave_js.update_firmware.warning"
            ),
            dismissText: hass.localize("ui.common.no"),
            confirmText: hass.localize("ui.common.yes"),
          })
        ) {
          showZWaveJUpdateFirmwareNodeDialog(el, {
            device,
            firmwareUpdateCapabilities,
          });
        }
      },
    });
  }

  return actions;
};
