import memoizeOne from "memoize-one";
import { getColorByIndex } from "../color/colors";
import { computeDomain } from "../entity/compute_domain";
import type { EntityRegistryEntry } from "../../data/entity/entity_registry";

/**
 * Map colors for entities, by registry creation order, so an entity has the
 * same color on every map. The registry comes from the fullEntitiesContext;
 * entities without an entry (e.g. YAML zones) get a color derived from their
 * id.
 */

export const HOME_ZONE_ENTITY_ID = "zone.home";

/** Domains whose entities are colored by creation order */
const ORDERED_DOMAINS = ["zone", "person", "device_tracker"];

// One index per registry update, shared by every map on the page. Zones,
// persons and trackers share one sequence, so a person never has the color
// of the zone it is in.
const creationIndex = memoizeOne(
  (entries: EntityRegistryEntry[]): Record<string, number> => {
    const index: Record<string, number> = {};
    entries
      .filter(
        (entry) =>
          ORDERED_DOMAINS.includes(computeDomain(entry.entity_id)) &&
          // The home zone has a fixed color and does not take a palette slot
          entry.entity_id !== HOME_ZONE_ENTITY_ID
      )
      .sort((a, b) => a.created_at - b.created_at || a.id.localeCompare(b.id))
      .forEach((entry, i) => {
        index[entry.entity_id] = i;
      });
    return index;
  }
);

// For entities without a registry entry
const hashIndex = (entityId: string): number => {
  let hash = 5381;
  for (let i = 0; i < entityId.length; i++) {
    hash = (hash * 33 + entityId.charCodeAt(i)) % 2147483647;
  }
  return hash;
};

/** The palette color of an entity on a map */
export const entityMapColor = (
  entityId: string,
  entries: EntityRegistryEntry[],
  computedStyles: CSSStyleDeclaration
): string =>
  getColorByIndex(
    creationIndex(entries)[entityId] ?? hashIndex(entityId),
    computedStyles
  );

/** A zone's color: primary for home, muted for passive, its entity map color otherwise */
export const zoneColor = (
  entityId: string,
  passive: boolean,
  entries: EntityRegistryEntry[],
  computedStyles: CSSStyleDeclaration
): string => {
  if (entityId === HOME_ZONE_ENTITY_ID) {
    return computedStyles.getPropertyValue("--primary-color");
  }
  if (passive) {
    return computedStyles.getPropertyValue("--secondary-text-color");
  }
  return entityMapColor(entityId, entries, computedStyles);
};
