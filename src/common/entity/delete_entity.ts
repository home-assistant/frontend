import type { HomeAssistant } from "../../types";
import type { IntegrationManifest } from "../../data/integration";
import { computeDomain } from "./compute_domain";
import { HELPERS_CRUD } from "../../data/helpers_crud";
import type { Helper } from "../../panels/config/helpers/const";
import { isHelperDomain } from "../../panels/config/helpers/const";
import { isComponentLoaded } from "../config/is_component_loaded";
import type { EntityRegistryEntry } from "../../data/entity_registry";
import { removeEntityRegistryEntry } from "../../data/entity_registry";
import type { ConfigEntry } from "../../data/config_entries";
import { deleteConfigEntry } from "../../data/config_entries";

export const isDeletableEntity = (
  hass: HomeAssistant,
  entity_id: string,
  manifests: IntegrationManifest[],
  entityRegistry: EntityRegistryEntry[],
  configEntries: ConfigEntry[],
  fetchedHelpers: Helper[]
): boolean => {
  const restored = !!hass.states[entity_id]?.attributes.restored;
  if (restored) {
    return true;
  }

  const domain = computeDomain(entity_id);
  const entityRegEntry = entityRegistry.find((e) => e.entity_id === entity_id);
  if (isHelperDomain(domain)) {
    return !!(
      isComponentLoaded(hass, domain) &&
      entityRegEntry &&
      fetchedHelpers.some((e) => e.id === entityRegEntry.unique_id)
    );
  }

  const configEntryId = entityRegEntry?.config_entry_id;
  if (!configEntryId) {
    return false;
  }
  const configEntry = configEntries.find((e) => e.entry_id === configEntryId);
  return (
    manifests.find((m) => m.domain === configEntry?.domain)
      ?.integration_type === "helper"
  );
};

export const deleteEntity = (
  hass: HomeAssistant,
  entity_id: string,
  manifests: IntegrationManifest[],
  entityRegistry: EntityRegistryEntry[],
  configEntries: ConfigEntry[],
  fetchedHelpers: Helper[]
) => {
  // This function assumes the entity_id already was validated by isDeletableEntity and does not repeat all those checks.
  const domain = computeDomain(entity_id);
  const entityRegEntry = entityRegistry.find((e) => e.entity_id === entity_id);
  if (isHelperDomain(domain)) {
    if (isComponentLoaded(hass, domain)) {
      if (
        entityRegEntry &&
        fetchedHelpers.some((e) => e.id === entityRegEntry.unique_id)
      ) {
        HELPERS_CRUD[domain].delete(hass, entityRegEntry.unique_id);
        return;
      }
    }
    const stateObj = hass.states[entity_id];
    if (!stateObj?.attributes.restored) {
      return;
    }
    removeEntityRegistryEntry(hass, entity_id);
    return;
  }

  const configEntryId = entityRegEntry?.config_entry_id;
  const configEntry = configEntryId
    ? configEntries.find((e) => e.entry_id === configEntryId)
    : undefined;
  const isHelperEntryType = configEntry
    ? manifests.find((m) => m.domain === configEntry.domain)
        ?.integration_type === "helper"
    : false;

  if (isHelperEntryType) {
    deleteConfigEntry(hass, configEntryId!);
    return;
  }

  removeEntityRegistryEntry(hass, entity_id);
};
