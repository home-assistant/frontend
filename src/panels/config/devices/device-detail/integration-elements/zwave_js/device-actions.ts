import {
  mdiAccountKey,
  mdiChatQuestion,
  mdiCog,
  mdiDelete,
  mdiDeleteForever,
  mdiHospitalBox,
  mdiInformationOutline,
  mdiPlus,
  mdiUpload,
} from "@mdi/js";
import { getConfigEntries } from "../../../../../../data/config_entries";
import type { DeviceRegistryEntry } from "../../../../../../data/device/device_registry";
import {
  fetchZwaveIsAnyOTAFirmwareUpdateInProgress,
  fetchZwaveIsNodeFirmwareUpdateInProgress,
  fetchZwaveNetworkStatus,
  fetchZwaveNodeStatus,
  fetchZwaveProvisioningEntries,
  unprovisionZwaveSmartStartNode,
} from "../../../../../../data/zwave_js";
import { getZwaveCredentialCapabilities } from "../../../../../../data/zwave_js-credentials";
import { showConfirmationDialog } from "../../../../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../../../../types";
import { showZwaveCredentialManageDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-credential-manage";
import { showZWaveJSAddNodeDialog } from "../../../../integrations/integration-panels/zwave_js/add-node/show-dialog-zwave_js-add-node";
import { showZWaveJSHardResetControllerDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-hard-reset-controller";
import { showZWaveJSNodeStatisticsDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-node-statistics";
import { showZWaveJSRebuildNodeRoutesDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-rebuild-node-routes";
import { showZWaveJSReinterviewNodeDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-reinterview-node";
import { showZWaveJSRemoveNodeDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-remove-node";
import { showZWaveJSUpdateFirmwareNodeDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-update-firmware-node";
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

  const provisioningEntries = await fetchZwaveProvisioningEntries(
    hass,
    entryId
  );
  const provisioningEntry = provisioningEntries.find(
    (entry) => entry.device_id === device.id
  );
  if (provisioningEntry && !provisioningEntry.nodeId) {
    return [
      {
        label: hass.localize("ui.common.remove"),
        classes: "warning",
        icon: mdiDelete,
        action: async () => {
          const confirm = await showConfirmationDialog(el, {
            title: hass.localize(
              "ui.panel.config.zwave_js.provisioned.confirm_unprovision_title"
            ),
            text: hass.localize(
              "ui.panel.config.zwave_js.provisioned.confirm_unprovision_text",
              { name: device.name_by_user || device.name }
            ),
            confirmText: hass.localize("ui.common.remove"),
            destructive: true,
          });

          if (confirm) {
            await unprovisionZwaveSmartStartNode(
              hass,
              entryId,
              provisioningEntry.dsk
            );
          }
        },
      },
    ];
  }
  const nodeStatus = await fetchZwaveNodeStatus(hass, device.id);

  if (!nodeStatus) {
    return [];
  }

  const actions: DeviceAction[] = [];

  if (!nodeStatus.is_controller_node) {
    actions.push(
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
        label: hass.localize(
          "ui.panel.config.zwave_js.device_info.rebuild_routes"
        ),
        icon: mdiHospitalBox,
        action: () =>
          showZWaveJSRebuildNodeRoutesDialog(el, {
            device,
          }),
      },
      {
        label: hass.localize(
          "ui.panel.config.zwave_js.device_info.node_statistics"
        ),
        icon: mdiInformationOutline,
        action: () =>
          showZWaveJSNodeStatisticsDialog(el, {
            device,
          }),
      },
      {
        label: hass.localize("ui.common.remove"),
        classes: "warning",
        icon: mdiDelete,
        action: () =>
          showZWaveJSRemoveNodeDialog(el, {
            deviceId: device.id,
            entryId,
          }),
      }
    );
  }

  // Check if this device supports credential management
  if (!nodeStatus.is_controller_node) {
    try {
      const capabilities = await getZwaveCredentialCapabilities(
        hass,
        device.id
      );
      if (capabilities.supports_user_management) {
        actions.push({
          label: hass.localize("ui.panel.config.zwave_js.credentials.manage"),
          icon: mdiAccountKey,
          action: () =>
            showZwaveCredentialManageDialog(el, {
              device_id: device.id,
            }),
        });
      }
    } catch {
      // Device does not support credential management — skip silently
    }
  }

  if (
    !(
      nodeStatus.ready &&
      (nodeStatus.is_controller_node || nodeStatus.has_firmware_update_cc)
    )
  ) {
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
              `ui.panel.config.zwave_js.update_firmware.${
                nodeStatus.is_controller_node ? "warning_controller" : "warning"
              }`
            ),
            dismissText: hass.localize("ui.common.no"),
            confirmText: hass.localize("ui.common.yes"),
          }))
        ) {
          showZWaveJSUpdateFirmwareNodeDialog(el, {
            device,
          });
        }
      },
    });
  }

  if (nodeStatus.is_controller_node) {
    const networkStatus = await fetchZwaveNetworkStatus(hass.connection, {
      entry_id: entryId,
    });
    actions.unshift({
      label: hass.localize("ui.panel.config.zwave_js.common.add_node"),
      icon: mdiPlus,
      action: async () => {
        showZWaveJSAddNodeDialog(el, {
          entry_id: entryId,
          longRangeSupported: networkStatus.controller?.supports_long_range,
        });
      },
    });
    actions.push({
      label: hass.localize(
        "ui.panel.config.zwave_js.device_info.hard_reset_controller"
      ),
      icon: mdiDeleteForever,
      action: async () => {
        showZWaveJSHardResetControllerDialog(el, {
          entryId,
        });
      },
    });
  }

  return actions;
};
