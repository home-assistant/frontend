import type {
  EntityHistoryState,
  HistoryStates,
} from "../../../../data/history";

/** One line of the overview's activity timeline */
export interface ActivityEntry {
  state: string;
  when: Date;
  /** Zone detail: the person that arrived at or left the zone */
  personId?: string;
  arrived?: boolean;
}

export const ACTIVITY_MAX_ENTRIES = 20;

/**
 * A person's state changes inside the window, newest first. History starts
 * with the state at the window's start, which is not an event; unavailable
 * samples are skipped so a dropout does not count as a change.
 */
export const personActivity = (
  history: EntityHistoryState[] | undefined,
  since: number
): ActivityEntry[] => {
  const entries: ActivityEntry[] = [];
  let previous: string | undefined;
  for (const entry of history ?? []) {
    if (entry.s === "unavailable") {
      continue;
    }
    const changed = entry.s !== previous;
    previous = entry.s;
    if (!changed || entry.lu * 1000 < since) {
      continue;
    }
    entries.push({ state: entry.s, when: new Date(entry.lu * 1000) });
  }
  return entries.reverse().slice(0, ACTIVITY_MAX_ENTRIES);
};

/**
 * Arrivals at and departures from a zone by the given persons, newest first.
 * A person is in the zone while their state equals zoneState.
 */
export const zoneActivity = (
  history: HistoryStates | undefined,
  personIds: string[],
  zoneState: string,
  since: number
): ActivityEntry[] => {
  const entries: ActivityEntry[] = [];
  for (const personId of personIds) {
    let wasInZone: boolean | undefined;
    for (const entry of history?.[personId] ?? []) {
      if (entry.s === "unavailable") {
        continue;
      }
      const inZone = entry.s === zoneState;
      // Only changes inside the window are events; the first sample is the
      // state at its start
      if (
        wasInZone !== undefined &&
        inZone !== wasInZone &&
        entry.lu * 1000 >= since
      ) {
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
