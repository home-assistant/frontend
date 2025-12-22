import {
  mdiAccessPoint,
  mdiAccountLock,
  mdiChatProcessing,
  mdiChatQuestion,
  mdiExportVariant,
} from "@mdi/js";
import { navigate } from "../../../../../../common/navigate";
import type { DeviceRegistryEntry } from "../../../../../../data/device/device_registry";
import {
  NetworkType,
  getMatterNodeDiagnostics,
} from "../../../../../../data/matter";
import { getMatterLockInfo } from "../../../../../../data/matter-lock";
import type { HomeAssistant } from "../../../../../../types";
import { showMatterManageFabricsDialog } from "../../../../integrations/integration-panels/matter/show-dialog-matter-manage-fabrics";
import { showMatterOpenCommissioningWindowDialog } from "../../../../integrations/integration-panels/matter/show-dialog-matter-open-commissioning-window";
import { showMatterPingNodeDialog } from "../../../../integrations/integration-panels/matter/show-dialog-matter-ping-node";
import { showMatterReinterviewNodeDialog } from "../../../../integrations/integration-panels/matter/show-dialog-matter-reinterview-node";
import { showMatterLockManageDialog } from "../../../../integrations/integration-panels/matter/show-dialog-matter-lock-manage";
import type { DeviceAction } from "../../../ha-config-device-page";

export const getMatterDeviceDefaultActions = (
  el: HTMLElement,
  hass: HomeAssistant,
  device: DeviceRegistryEntry
): DeviceAction[] => {
  if (device.via_device_id !== null) {
    // only show device actions for top level nodes (so not bridged)
    return [];
  }

  const actions: DeviceAction[] = [];

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

export const getMatterDeviceActions = async (
  el: HTMLElement,
  hass: HomeAssistant,
  device: DeviceRegistryEntry
): Promise<DeviceAction[]> => {
  // eslint-disable-next-line no-console
  console.log(
    "[Matter Debug] getMatterDeviceActions called for device:",
    device.id,
    device.name
  );

  if (device.via_device_id !== null) {
    // only show device actions for top level nodes (so not bridged)
    // eslint-disable-next-line no-console
    console.log(
      "[Matter Debug] Skipping - device has via_device_id:",
      device.via_device_id
    );
    return [];
  }

  const nodeDiagnostics = await getMatterNodeDiagnostics(hass, device.id);
  // eslint-disable-next-line no-console
  console.log("[Matter Debug] Node diagnostics:", nodeDiagnostics);

  const actions: DeviceAction[] = [];

  if (nodeDiagnostics.available) {
    // actions that can only be performed if the device is alive
    actions.push({
      label: hass.localize(
        "ui.panel.config.matter.device_actions.open_commissioning_window"
      ),
      icon: mdiExportVariant,
      action: () =>
        showMatterOpenCommissioningWindowDialog(el, {
          device_id: device.id,
        }),
    });
    actions.push({
      label: hass.localize(
        "ui.panel.config.matter.device_actions.manage_fabrics"
      ),
      icon: mdiExportVariant,
      action: () =>
        showMatterManageFabricsDialog(el, {
          device_id: device.id,
        }),
    });
    actions.push({
      label: hass.localize(
        "ui.panel.config.matter.device_actions.reinterview_device"
      ),
      icon: mdiChatProcessing,
      action: () =>
        showMatterReinterviewNodeDialog(el, {
          device_id: device.id,
        }),
    });
  }

  if (nodeDiagnostics.network_type === NetworkType.THREAD) {
    actions.push({
      label: hass.localize(
        "ui.panel.config.matter.device_actions.view_thread_network"
      ),
      icon: mdiAccessPoint,
      action: () => navigate("/config/thread"),
    });
  }

  // Check if device is a lock and add lock management action
  try {
    // eslint-disable-next-line no-console
    console.log(
      "[Matter Lock Debug] Checking lock info for device:",
      device.id
    );
    const lockInfo = await getMatterLockInfo(hass, device.id);
    // eslint-disable-next-line no-console
    console.log("[Matter Lock Debug] Lock info result:", lockInfo);
    if (lockInfo.supports_user_management) {
      actions.push({
        label: hass.localize(
          "ui.panel.config.matter.device_actions.manage_lock"
        ),
        icon: mdiAccountLock,
        action: () =>
          showMatterLockManageDialog(el, {
            device_id: device.id,
          }),
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[Matter Lock Debug] Error getting lock info:", err);
  }

  return actions;
};
