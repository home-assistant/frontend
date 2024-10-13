import { HomeAssistant } from "../../types";
import { IntegrationManifest } from "../../data/integration";
// import { EntitySources } from "../../data/entity_sources";
import { computeDomain } from "./compute_domain";
import { HELPERS_CRUD } from "../../data/helpers_crud";
import { isComponentLoaded } from "../config/is_component_loaded";
import {
  removeEntityRegistryEntry,
  EntityRegistryEntry,
} from "../../data/entity_registry";
import { ConfigEntry, deleteConfigEntry } from "../../data/config_entries";

const isHelper = (
  entity_id: string,
  manifests: IntegrationManifest[],
  entityRegistry: EntityRegistryEntry[],
  configEntries: ConfigEntry[]
): boolean => {
  const domain = computeDomain(entity_id);
  if (HELPERS_CRUD[domain]) {
    return true;
  }
  const entityRegEntry = entityRegistry.find((e) => e.entity_id === entity_id);
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

export const isDeletableEntity = (
  hass: HomeAssistant,
  entity_id: string,
  manifests: IntegrationManifest[],
  entityRegistry: EntityRegistryEntry[],
  configEntries: ConfigEntry[]
): boolean => {
  const restored = !!hass.states[entity_id]?.attributes.restored;
  if (restored) {
    return true;
  }
  const domain = computeDomain(entity_id);
  if (HELPERS_CRUD[domain]) {
    return (
      isComponentLoaded(hass, domain) &&
      entityRegistry.some((e) => e.entity_id === entity_id)
    );
  }
  return isHelper(entity_id, manifests, entityRegistry, configEntries);
};

export const deleteEntity = (
  hass: HomeAssistant,
  entity_id: string,
  manifests: IntegrationManifest[],
  entityRegistry: EntityRegistryEntry[],
  configEntries: ConfigEntry[]
) => {
  if (isHelper(entity_id, manifests, entityRegistry, configEntries)) {
    const domain = computeDomain(entity_id);
    if (HELPERS_CRUD[domain]) {
      if (isComponentLoaded(hass, domain)) {
        const entityRegEntry = entityRegistry.find(
          (e) => e.entity_id === entity_id
        );
        if (entityRegEntry) {
          HELPERS_CRUD[domain].delete(hass, entityRegEntry.unique_id);
          return;
        }
      }
      const stateObj = hass.states[entity_id];
      if (!stateObj?.attributes.restored) {
        return;
      }
      removeEntityRegistryEntry(hass, entity_id);
    } else {
      const configEntryId = entityRegistry.find(
        (e) => e.entity_id === entity_id
      )?.config_entry_id;
      if (configEntryId) {
        deleteConfigEntry(hass, configEntryId);
      } else {
        removeEntityRegistryEntry(hass, entity_id);
      }
    }
  } else {
    removeEntityRegistryEntry(hass, entity_id);
  }
};
