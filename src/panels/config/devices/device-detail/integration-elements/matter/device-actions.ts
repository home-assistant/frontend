import {
  mdiAccessPoint,
  mdiChatProcessing,
  mdiChatQuestion,
  mdiExportVariant,
} from "@mdi/js";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import {
  NetworkType,
  getMatterNodeDiagnostics,
} from "../../../../../../data/matter";
import type { HomeAssistant } from "../../../../../../types";
import { showMatterReinterviewNodeDialog } from "../../../../integrations/integration-panels/matter/show-dialog-matter-reinterview-node";
import { showMatterPingNodeDialog } from "../../../../integrations/integration-panels/matter/show-dialog-matter-ping-node";
import { showMatterOpenCommissioningWindowDialog } from "../../../../integrations/integration-panels/matter/show-dialog-matter-open-commissioning-window";
import type { DeviceAction } from "../../../ha-config-device-page";
import { showMatterManageFabricsDialog } from "../../../../integrations/integration-panels/matter/show-dialog-matter-manage-fabrics";
import { navigate } from "../../../../../../common/navigate";

export const getMatterDeviceActions = async (
  el: HTMLElement,
  hass: HomeAssistant,
  device: DeviceRegistryEntry
): Promise<DeviceAction[]> => {
  if (device.via_device_id !== null) {
    // only show device actions for top level nodes (so not bridged)
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
