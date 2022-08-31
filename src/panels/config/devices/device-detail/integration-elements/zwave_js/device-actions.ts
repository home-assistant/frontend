import {
  mdiChatQuestion,
  mdiCog,
  mdiDeleteForever,
  mdiHospitalBox,
  mdiInformation,
  mdiUpload,
} from "@mdi/js";
import { getConfigEntries } from "../../../../../../data/config_entries";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import {
  fetchZwaveIsAnyOTAFirmwareUpdateInProgress,
  fetchZwaveIsNodeFirmwareUpdateInProgress,
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
      icon: mdiCog,
      href: `/config/zwave_js/node_config/${device.id}?config_entry=${entryId}`,
    },
    {
      label: hass.localize(
        "ui.panel.config.zwave_js.device_info.reinterview_device"
      ),
      icon: mdiChatQuestion,
      action: () =>
        showZWaveJSReinterviewNodeDialog(el, {
          device_id: device.id,
        }),
    },
    {
      label: hass.localize("ui.panel.config.zwave_js.device_info.heal_node"),
      icon: mdiHospitalBox,
      action: () =>
        showZWaveJSHealNodeDialog(el, {
          device,
        }),
    },
    {
      label: hass.localize(
        "ui.panel.config.zwave_js.device_info.remove_failed"
      ),
      icon: mdiDeleteForever,
      action: () =>
        showZWaveJSRemoveFailedNodeDialog(el, {
          device_id: device.id,
        }),
    },
    {
      label: hass.localize(
        "ui.panel.config.zwave_js.device_info.node_statistics"
      ),
      icon: mdiInformation,
      action: () =>
        showZWaveJSNodeStatisticsDialog(el, {
          device,
        }),
    },
  ];

  if (!nodeStatus.ready) {
    return actions;
  }

  const [isAnyFirmwareUpdateInProgress, isNodeFirmwareUpdateInProgress] =
    await Promise.all([
      fetchZwaveIsAnyOTAFirmwareUpdateInProgress(hass, entryId),
      fetchZwaveIsNodeFirmwareUpdateInProgress(hass, device.id),
    ]);

  if (!isAnyFirmwareUpdateInProgress || isNodeFirmwareUpdateInProgress) {
    actions.push({
      label: hass.localize(
        "ui.panel.config.zwave_js.device_info.update_firmware"
      ),
      icon: mdiUpload,
      action: async () => {
        if (
          isNodeFirmwareUpdateInProgress ||
          (await fetchZwaveIsNodeFirmwareUpdateInProgress(hass, device.id)) ||
          (await showConfirmationDialog(el, {
            text: hass.localize(
              "ui.panel.config.zwave_js.update_firmware.warning"
            ),
            dismissText: hass.localize("ui.common.no"),
            confirmText: hass.localize("ui.common.yes"),
          }))
        ) {
          showZWaveJUpdateFirmwareNodeDialog(el, {
            device,
          });
        }
      },
    });
  }

  return actions;
};
