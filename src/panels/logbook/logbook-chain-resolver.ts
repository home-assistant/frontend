import type { LogbookEntry } from "../../data/logbook";
import { getLogbookEvents } from "../../data/logbook";
import type { HomeAssistant } from "../../types";
import type { LogbookCause } from "./logbook-entry-model";
import {
  classifyLogbookEntry,
  computeContextCause,
  computeLogbookCause,
  computeUserCause,
  isRunCause,
  isSameLogbookEntry,
} from "./logbook-entry-model";

// No run start is available and a delayed script can start long before the
// clicked entry.
const LOOKBACK_MS = 24 * 60 * 60 * 1000;

const WHEN_EPSILON = 0.001;

const MAX_RUN_CANDIDATES = 3;

export interface LogbookChain {
  rows: LogbookEntry[];
  runRow?: LogbookEntry;
  // Causes shown above the run, topmost first.
  origins: LogbookCause[];
  // Stands in for the run row when it could not be fetched.
  syntheticRun?: LogbookCause;
  // The state change that fired a state trigger in `origins`.
  triggerRow?: LogbookEntry;
}

export type LogbookFetcher = (
  startDate: string,
  endDate?: string,
  entityIds?: string[],
  contextId?: string
) => Promise<LogbookEntry[]>;

interface ResolveOptions {
  userIdToName?: Record<string, string>;
  systemUserIds?: Set<string>;
}

const lookbackIso = (when: number) =>
  new Date(when * 1000 - LOOKBACK_MS).toISOString();

const justAfterIso = (when: number) =>
  new Date(when * 1000 + 1000).toISOString();

// Effect rows never carry a context_id, run rows do.
const resolveRowsByContextEntity = async (
  entry: LogbookEntry,
  fetchEvents: LogbookFetcher
): Promise<LogbookEntry[]> => {
  const contextEntityId = entry.context_entity_id!;
  const runs = (
    await fetchEvents(lookbackIso(entry.when), justAfterIso(entry.when), [
      contextEntityId,
    ])
  )
    .filter((row) => row.context_id && row.when <= entry.when + WHEN_EPSILON)
    .sort((a, b) => b.when - a.when)
    .slice(0, MAX_RUN_CANDIDATES);

  for (const run of runs) {
    // eslint-disable-next-line no-await-in-loop
    const rows = await fetchEvents(
      lookbackIso(entry.when),
      undefined,
      undefined,
      run.context_id
    );
    if (rows.some((row) => isSameLogbookEntry(row, entry))) {
      return rows;
    }
  }
  return [];
};

const resolveTriggerRow = async (
  entityId: string,
  beforeWhen: number,
  fetchEvents: LogbookFetcher
): Promise<LogbookEntry | undefined> => {
  const rows = await fetchEvents(
    lookbackIso(beforeWhen),
    justAfterIso(beforeWhen),
    [entityId]
  );
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (row.state !== undefined && row.when <= beforeWhen + WHEN_EPSILON) {
      return row;
    }
  }
  return undefined;
};

export const resolveLogbookChain = async (
  hass: HomeAssistant,
  entry: LogbookEntry,
  options: ResolveOptions = {},
  fetchEvents: LogbookFetcher = (startDate, endDate, entityIds, contextId) =>
    getLogbookEvents(hass, startDate, endDate, entityIds, contextId)
): Promise<LogbookChain> => {
  const userIdToName = options.userIdToName ?? {};
  const { systemUserIds } = options;

  let rows: LogbookEntry[] = [];
  if (entry.context_id) {
    rows = await fetchEvents(
      lookbackIso(entry.when),
      undefined,
      undefined,
      entry.context_id
    );
  } else if (entry.context_entity_id) {
    rows = await resolveRowsByContextEntity(entry, fetchEvents);
  }
  if (!rows.length) {
    rows = [entry];
  }

  let runRow = rows.find((row) => classifyLogbookEntry(row) === "automation");
  if (runRow && runRow !== entry && isSameLogbookEntry(entry, runRow)) {
    // The clicked feed copy carries the call_service description that the
    // fetched copy of the run row never has.
    rows = rows.map((row) => (row === runRow ? entry : row));
    runRow = entry;
  }
  const origins: LogbookCause[] = [];
  let syntheticRun: LogbookCause | undefined;
  if (runRow) {
    const runCause = computeLogbookCause(
      hass,
      runRow,
      userIdToName,
      systemUserIds
    );
    if (runCause?.type !== "user" && !isSameLogbookEntry(entry, runRow)) {
      // The run row is its own context origin and comes back without the
      // user its effects carry: read the user from the clicked entry.
      const userCause = computeUserCause(entry, userIdToName, systemUserIds);
      if (userCause) {
        origins.push(userCause);
      }
    }
    if (runCause) {
      origins.push(runCause);
    }
  } else {
    const userCause = computeUserCause(entry, userIdToName, systemUserIds);
    const contextCause = computeContextCause(hass, entry);
    if (isRunCause(contextCause)) {
      syntheticRun = contextCause;
      if (userCause) {
        origins.push(userCause);
      }
    } else {
      const cause = userCause ?? contextCause;
      if (cause) {
        origins.push(cause);
      }
    }
  }

  const stateOrigin = origins.find(
    (cause) => cause.type === "state" && cause.entityId
  );
  const triggerRow = stateOrigin
    ? await resolveTriggerRow(
        stateOrigin.entityId!,
        (runRow ?? entry).when,
        fetchEvents
      )
    : undefined;

  return { rows, runRow, origins, syntheticRun, triggerRow };
};
