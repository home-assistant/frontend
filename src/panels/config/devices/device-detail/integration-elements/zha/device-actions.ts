import {
  mdiCogRefresh,
  mdiDelete,
  mdiDrawPen,
  mdiFamilyTree,
  mdiFileTree,
  mdiGroup,
  mdiPlus,
} from "@mdi/js";
import { navigate } from "../../../../../../common/navigate";
import type { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import { fetchZHADevice } from "../../../../../../data/zha";
import { showConfirmationDialog } from "../../../../../../dialogs/generic/show-dialog-box";
import type { HomeAssistant } from "../../../../../../types";
import { showZHAClusterDialog } from "../../../../integrations/integration-panels/zha/show-dialog-zha-cluster";
import { showZHADeviceChildrenDialog } from "../../../../integrations/integration-panels/zha/show-dialog-zha-device-children";
import { showZHADeviceZigbeeInfoDialog } from "../../../../integrations/integration-panels/zha/show-dialog-zha-device-zigbee-info";
import { showZHAReconfigureDeviceDialog } from "../../../../integrations/integration-panels/zha/show-dialog-zha-reconfigure-device";
import type { DeviceAction } from "../../../ha-config-device-page";

export const getZHADeviceActions = async (
  el: HTMLElement,
  hass: HomeAssistant,
  device: DeviceRegistryEntry
): Promise<DeviceAction[]> => {
  const zigbeeConnection = device.connections.find(
    (conn) => conn[0] === "zigbee"
  );

  if (!zigbeeConnection) {
    return [];
  }

  const zhaDevice = await fetchZHADevice(hass, zigbeeConnection[1]);

  if (!zhaDevice) {
    return [];
  }

  const actions: DeviceAction[] = [];

  if (!zhaDevice.active_coordinator) {
    actions.push({
      label: hass.localize("ui.dialogs.zha_device_info.buttons.reconfigure"),
      icon: mdiCogRefresh,
      action: () => showZHAReconfigureDeviceDialog(el, { device: zhaDevice }),
    });
  }

  if (
    zhaDevice.power_source === "Mains" &&
    (zhaDevice.device_type === "Router" ||
      zhaDevice.device_type === "Coordinator")
  ) {
    actions.push(
      ...[
        {
          label: hass.localize("ui.dialogs.zha_device_info.buttons.add"),
          icon: mdiPlus,
          action: () => navigate(`/config/zha/add/${zhaDevice!.ieee}`),
        },
        {
          label: hass.localize(
            "ui.dialogs.zha_device_info.buttons.device_children"
          ),
          icon: mdiFileTree,
          action: () => showZHADeviceChildrenDialog(el, { device: zhaDevice! }),
        },
      ]
    );
  }

  actions.push(
    ...[
      {
        label: hass.localize(
          "ui.dialogs.zha_device_info.buttons.zigbee_information"
        ),
        icon: mdiDrawPen,
        action: () => showZHADeviceZigbeeInfoDialog(el, { device: zhaDevice }),
      },
      {
        label: hass.localize("ui.dialogs.zha_device_info.buttons.clusters"),
        icon: mdiGroup,
        action: () => showZHAClusterDialog(el, { device: zhaDevice }),
      },
      {
        label: hass.localize("ui.dialogs.zha_device_info.buttons.view_network"),
        icon: mdiFamilyTree,
        action: () =>
          navigate(`/config/zha/visualization/${zhaDevice!.device_reg_id}`),
      },
    ]
  );

  if (!zhaDevice.active_coordinator) {
    actions.push({
      label: hass.localize("ui.dialogs.zha_device_info.buttons.remove"),
      icon: mdiDelete,
      classes: "warning",
      action: async () => {
        const confirmed = await showConfirmationDialog(el, {
          text: hass.localize(
            "ui.dialogs.zha_device_info.confirmations.remove"
          ),
        });

        if (!confirmed) {
          return;
        }

        await hass.callService("zha", "remove", {
          ieee: zhaDevice.ieee,
        });

        history.back();
      },
    });
  }

  return actions;
};
