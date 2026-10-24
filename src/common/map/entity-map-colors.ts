import memoizeOne from "memoize-one";
import { getColorByIndex } from "../color/colors";
import { computeDomain } from "../entity/compute_domain";
import type { EntityRegistryEntry } from "../../data/entity/entity_registry";

/**
 * Map colors for entities, from their place in the registry, so an entity has
 * the same color on every map. Zones have their own sequence. Persons and
 * trackers share another, persons first, so trackers discovered over time
 * shift neither. Entities without an entry (e.g. YAML zones) get a color
 * derived from their id.
 */

export const HOME_ZONE_ENTITY_ID = "zone.home";

const byCreation = (a: EntityRegistryEntry, b: EntityRegistryEntry) =>
  a.created_at - b.created_at || a.id.localeCompare(b.id);

const domainEntries = (entries: EntityRegistryEntry[], domain: string) =>
  entries
    .filter((entry) => computeDomain(entry.entity_id) === domain)
    .sort(byCreation);

const paletteIndex = memoizeOne((entries: EntityRegistryEntry[]) => {
  // The home zone has a fixed color and does not take a palette slot
  const zones = domainEntries(entries, "zone").filter(
    (entry) => entry.entity_id !== HOME_ZONE_ENTITY_ID
  );
  const personsAndTrackers = [
    ...domainEntries(entries, "person"),
    ...domainEntries(entries, "device_tracker"),
  ];
  const byEntityId: Record<string, number> = {};
  [zones, personsAndTrackers].forEach((sequence) =>
    sequence.forEach((entry, i) => {
      byEntityId[entry.entity_id] = i;
    })
  );
  return { byEntityId, zoneCount: zones.length };
});

// For entities outside both sequences
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
    paletteIndex(entries).byEntityId[entityId] ?? hashIndex(entityId),
    computedStyles
  );

/** The color a new zone will take once created, from the slot after the last zone */
export const nextZoneColor = (
  passive: boolean,
  entries: EntityRegistryEntry[],
  computedStyles: CSSStyleDeclaration
): string => {
  if (passive) {
    return computedStyles.getPropertyValue("--secondary-text-color");
  }
  return getColorByIndex(paletteIndex(entries).zoneCount, computedStyles);
};

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
