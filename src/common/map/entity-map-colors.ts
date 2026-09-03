import type { Connection, UnsubscribeFunc } from "home-assistant-js-websocket";
import { getColorByIndex } from "../color/colors";
import { computeDomain } from "../entity/compute_domain";
import type { EntityRegistryEntry } from "../../data/entity/entity_registry";
import { subscribeEntityRegistry } from "../../data/entity/entity_registry";

/**
 * Map colors for entities, by registry creation order per domain, so an
 * entity has the same color on every map. Entities without a registry entry
 * (e.g. YAML zones) get a color derived from their id.
 */

export const HOME_ZONE_ENTITY_ID = "zone.home";

/** Domains whose entities are colored by creation order */
const ORDERED_DOMAINS = ["zone", "person", "device_tracker"];

let creationIndex: Record<string, number> = {};
let subscribers = 0;
let unsubscribe: UnsubscribeFunc | undefined;
const listeners = new Set<() => void>();

const rebuildIndex = (entries: EntityRegistryEntry[]) => {
  const byDomain: Record<string, EntityRegistryEntry[]> = {};
  for (const entry of entries) {
    const domain = computeDomain(entry.entity_id);
    if (ORDERED_DOMAINS.includes(domain)) {
      (byDomain[domain] ??= []).push(entry);
    }
  }
  const index: Record<string, number> = {};
  for (const domainEntries of Object.values(byDomain)) {
    domainEntries
      .sort((a, b) => a.created_at - b.created_at || a.id.localeCompare(b.id))
      // The home zone has a fixed color and does not take a palette slot
      .filter((entry) => entry.entity_id !== HOME_ZONE_ENTITY_ID)
      .forEach((entry, i) => {
        index[entry.entity_id] = i;
      });
  }
  creationIndex = index;
  listeners.forEach((listener) => listener());
};

/** Keeps the creation order current while a map is alive; onChange runs when colors may have changed */
export const subscribeEntityMapColors = (
  connection: Connection,
  onChange: () => void
): UnsubscribeFunc => {
  listeners.add(onChange);
  subscribers++;
  if (!unsubscribe) {
    unsubscribe = subscribeEntityRegistry(connection, rebuildIndex);
  }
  return () => {
    listeners.delete(onChange);
    subscribers--;
    if (subscribers === 0 && unsubscribe) {
      unsubscribe();
      unsubscribe = undefined;
      creationIndex = {};
    }
  };
};

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
  computedStyles: CSSStyleDeclaration
): string =>
  getColorByIndex(
    creationIndex[entityId] ?? hashIndex(entityId),
    computedStyles
  );

/** A zone's color: primary for home, muted for passive, its entity map color otherwise */
export const zoneColor = (
  entityId: string,
  passive: boolean,
  computedStyles: CSSStyleDeclaration
): string => {
  if (entityId === HOME_ZONE_ENTITY_ID) {
    return computedStyles.getPropertyValue("--primary-color");
  }
  if (passive) {
    return computedStyles.getPropertyValue("--secondary-text-color");
  }
  return entityMapColor(entityId, computedStyles);
};
