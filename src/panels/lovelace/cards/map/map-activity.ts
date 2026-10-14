import type { HassEntities } from "home-assistant-js-websocket";
import { computeStateDomain } from "../../../../common/entity/compute_state_domain";
import { HOME_ZONE_ENTITY_ID } from "../../../../common/map/entity-map-colors";
import type {
  EntityHistoryState,
  HistoryStates,
} from "../../../../data/history";
import { UNAVAILABLE, UNKNOWN } from "../../../../data/entity/entity";
import { computeZoneTrackerState } from "../../../../data/zone";

// A person or tracker without a location; skipped so a dropout is not an event
const NO_LOCATION_STATES: string[] = [UNAVAILABLE, UNKNOWN];

/** One line of the overview's activity timeline */
export interface ActivityEntry {
  state: string;
  when: Date;
  zoneId?: string;
  /** Zone detail: the person that arrived at or left the zone */
  personId?: string;
  arrived?: boolean;
}

export const ACTIVITY_MAX_ENTRIES = 20;

const activityZoneId = (
  entry: EntityHistoryState,
  states: HassEntities
): string | undefined => {
  if (entry.s === "not_home" || NO_LOCATION_STATES.includes(entry.s)) {
    return undefined;
  }

  const inZones: string[] | undefined = entry.a?.in_zones;
  if (Array.isArray(inZones) && inZones.length > 0) {
    return inZones.find((zoneId) => {
      const zone = states[zoneId];
      return zone && !zone.attributes.passive;
    });
  }

  if (entry.s === "home") {
    return HOME_ZONE_ENTITY_ID;
  }

  const matchingZones = Object.values(states).filter(
    (zone) =>
      computeStateDomain(zone) === "zone" &&
      !zone.attributes.passive &&
      computeZoneTrackerState(zone) === entry.s
  );
  return matchingZones.length === 1 ? matchingZones[0].entity_id : undefined;
};

/**
 * A person's state changes inside the window, newest first. History starts
 * with the state at the window's start, which is not an event; no-location
 * samples are skipped so a dropout does not count as a change.
 */
export const personActivity = (
  history: EntityHistoryState[] | undefined,
  since: number,
  states: HassEntities
): ActivityEntry[] => {
  const entries: ActivityEntry[] = [];
  let previousState: string | undefined;
  let previousZoneId: string | undefined;
  for (const entry of history ?? []) {
    if (NO_LOCATION_STATES.includes(entry.s)) {
      continue;
    }
    const zoneId = activityZoneId(entry, states);
    const changed = entry.s !== previousState || zoneId !== previousZoneId;
    previousState = entry.s;
    previousZoneId = zoneId;
    if (!changed || entry.lu * 1000 < since) {
      continue;
    }
    entries.push({ state: entry.s, zoneId, when: new Date(entry.lu * 1000) });
  }
  return entries.reverse().slice(0, ACTIVITY_MAX_ENTRIES);
};

/**
 * Arrivals at and departures from a zone by the given persons, newest first.
 */
export const zoneActivity = (
  history: HistoryStates | undefined,
  personIds: string[],
  zoneId: string,
  since: number,
  states: HassEntities
): ActivityEntry[] => {
  const entries: ActivityEntry[] = [];
  for (const personId of personIds) {
    let wasInZone: boolean | undefined;
    for (const entry of history?.[personId] ?? []) {
      if (NO_LOCATION_STATES.includes(entry.s)) {
        continue;
      }
      const inZones: string[] | undefined = entry.a?.in_zones;
      const inZone = Array.isArray(inZones)
        ? inZones.includes(zoneId)
        : activityZoneId(entry, states) === zoneId;
      // The first sample is an event only if it is an in-window arrival.
      const isEvent = wasInZone === undefined ? inZone : inZone !== wasInZone;
      if (isEvent && entry.lu * 1000 >= since) {
        entries.push({
          state: entry.s,
          personId,
          arrived: inZone,
          when: new Date(entry.lu * 1000),
        });
      }
      wasInZone = inZone;
    }
  }
  entries.sort((a, b) => b.when.getTime() - a.when.getTime());
  return entries.slice(0, ACTIVITY_MAX_ENTRIES);
};
