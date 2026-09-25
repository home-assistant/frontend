import { mdiKey } from "@mdi/js";
import { getConfigEntries } from "../../../../../../data/config_entries";
import type { DeviceRegistryEntry } from "../../../../../../data/device/device_registry";
import { fetchESPHomeEncryptionKey } from "../../../../../../data/esphome";
import type { HomeAssistant } from "../../../../../../types";
import { showESPHomeEncryptionKeyDialog } from "../../../../integrations/integration-panels/esphome/show-dialog-esphome-encryption-key";
import type { DeviceAction } from "../../../ha-config-device-page";

export const getESPHomeDeviceActions = async (
  el: HTMLElement,
  hass: HomeAssistant,
  device: DeviceRegistryEntry
): Promise<DeviceAction[]> => {
  const actions: DeviceAction[] = [];

  const configEntries = await getConfigEntries(hass, {
    domain: "esphome",
  });

  const configEntry = configEntries.find((entry) =>
    device.config_entries.includes(entry.entry_id)
  );

  if (!configEntry) {
    return [];
  }

  const entryId = configEntry.entry_id;

  try {
    const encryptionKey = await fetchESPHomeEncryptionKey(hass, entryId);

    if (encryptionKey.encryption_key) {
      actions.push({
        label: hass.localize(
          "ui.panel.config.devices.esphome.show_encryption_key"
        ),
        icon: mdiKey,
        action: () =>
          showESPHomeEncryptionKeyDialog(el, {
            entry_id: entryId,
            encryption_key: encryptionKey.encryption_key,
          }),
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to fetch ESPHome encryption key:", err);
  }

  return actions;
};
