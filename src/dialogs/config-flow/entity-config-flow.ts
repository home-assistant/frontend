import type { ConfigEntry, SubEntry } from "../../data/config_entries";
import { getConfigEntry, getSubEntries } from "../../data/config_entries";
import { getExtendedEntityRegistryEntry } from "../../data/entity/entity_registry";
import { fetchIntegrationManifest } from "../../data/integration";
import type { HomeAssistant } from "../../types";
import { showOptionsFlowDialog } from "./show-dialog-options-flow";
import { showSubConfigFlowDialog } from "./show-dialog-sub-config-flow";

export interface EntityConfigFlow {
  entry: ConfigEntry;
  subEntry?: SubEntry;
}

export const fetchEntityConfigFlow = async (
  hass: HomeAssistant,
  entityId: string
): Promise<EntityConfigFlow | undefined> => {
  if (!(entityId in hass.entities)) {
    return undefined;
  }
  const regEntry = await getExtendedEntityRegistryEntry(hass, entityId);
  if (!regEntry.config_entry_id) {
    return undefined;
  }
  const { config_entry: entry } = await getConfigEntry(
    hass,
    regEntry.config_entry_id
  );
  if (regEntry.config_subentry_id) {
    const subEntry = (await getSubEntries(hass, entry.entry_id)).find(
      (sub) => sub.subentry_id === regEntry.config_subentry_id
    );
    if (
      subEntry &&
      entry.supported_subentry_types[subEntry.subentry_type]
        ?.supports_reconfigure
    ) {
      return { entry, subEntry };
    }
  }
  return entry.supports_options ? { entry } : undefined;
};

export const showEntityConfigFlow = async (
  element: HTMLElement,
  hass: HomeAssistant,
  { entry, subEntry }: EntityConfigFlow
) => {
  if (subEntry) {
    showSubConfigFlowDialog(element, entry, subEntry.subentry_type, {
      startFlowHandler: entry.entry_id,
      subEntryId: subEntry.subentry_id,
    });
    return;
  }
  showOptionsFlowDialog(element, entry, {
    manifest: await fetchIntegrationManifest(hass, entry.domain),
  });
};
