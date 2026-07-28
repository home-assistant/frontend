import { describe, expect, it } from "vitest";
import type { LogbookEntry } from "../../../src/data/logbook";
import type { LogbookFetcher } from "../../../src/panels/logbook/logbook-chain-resolver";
import { resolveLogbookChain } from "../../../src/panels/logbook/logbook-chain-resolver";
import type { HomeAssistant } from "../../../src/types";

const hass = {
  language: "en",
  translationMetadata: { translations: {} },
  states: {},
  entities: {},
  devices: {},
  areas: {},
  floors: {},
  localize: () => "",
} as unknown as HomeAssistant;

const USERS = { user_1: "Alice" };

const entry = (partial: Partial<LogbookEntry>): LogbookEntry => ({
  when: 0,
  name: "",
  ...partial,
});

const runRow = (when: number, contextId: string): LogbookEntry =>
  entry({
    when,
    name: "Wake up",
    entity_id: "automation.wake_up",
    domain: "automation",
    source: "state of binary_sensor.motion",
    context_id: contextId,
  });

const effectRow = (when: number): LogbookEntry =>
  entry({
    when,
    name: "Ceiling light",
    entity_id: "light.ceiling",
    state: "on",
    context_event_type: "automation_triggered",
    context_name: "Wake up",
    context_entity_id: "automation.wake_up",
    context_source: "state of binary_sensor.motion",
  });

interface FetchCall {
  entityIds?: string[];
  contextId?: string;
}

const makeFetcher = (
  handler: (entityIds?: string[], contextId?: string) => LogbookEntry[]
): { fetch: LogbookFetcher; calls: FetchCall[] } => {
  const calls: FetchCall[] = [];
  return {
    calls,
    fetch: async (_start, _end, entityIds, contextId) => {
      calls.push({ entityIds, contextId });
      return handler(entityIds, contextId);
    },
  };
};

describe("resolveLogbookChain", () => {
  it("fetches by context id when the entry has one", async () => {
    const run = runRow(10, "ctx_run");
    const effect = { ...effectRow(11), context_id: "ctx_run" };
    const { fetch, calls } = makeFetcher((entityIds, contextId) => {
      if (contextId === "ctx_run") {
        return [run, effect];
      }
      if (entityIds?.includes("binary_sensor.motion")) {
        return [
          entry({ when: 9.8, entity_id: "binary_sensor.motion", state: "on" }),
        ];
      }
      return [];
    });

    const chain = await resolveLogbookChain(hass, effect, {}, fetch);

    expect(calls[0].contextId).toBe("ctx_run");
    expect(chain.runRow).toBe(run);
    expect(chain.rows).toEqual([run, effect]);
    expect(chain.origins).toHaveLength(1);
    expect(chain.origins[0].type).toBe("state");
    expect(chain.origins[0].entityId).toBe("binary_sensor.motion");
    expect(chain.syntheticRun).toBeUndefined();
    expect(chain.triggerRow?.when).toBe(9.8);
  });

  it("resolves the run through the context entity and verifies candidates", async () => {
    const effect = effectRow(11);
    const otherRun = runRow(10.9, "ctx_other");
    const goodRun = runRow(10, "ctx_good");
    const { fetch, calls } = makeFetcher((entityIds, contextId) => {
      if (entityIds?.includes("automation.wake_up")) {
        return [goodRun, otherRun];
      }
      if (contextId === "ctx_other") {
        // The closest run does not contain the clicked entry.
        return [
          otherRun,
          entry({ when: 11, entity_id: "light.desk", state: "on" }),
        ];
      }
      if (contextId === "ctx_good") {
        return [goodRun, effect];
      }
      return [];
    });

    const chain = await resolveLogbookChain(hass, effect, {}, fetch);

    expect(calls[0].entityIds).toEqual(["automation.wake_up"]);
    expect(calls[1].contextId).toBe("ctx_other");
    expect(calls[2].contextId).toBe("ctx_good");
    expect(chain.runRow?.context_id).toBe("ctx_good");
    expect(chain.rows).toEqual([goodRun, effect]);
  });

  it("falls back to a synthetic run when no candidate matches", async () => {
    const effect = effectRow(11);
    const { fetch } = makeFetcher((entityIds) =>
      entityIds?.includes("automation.wake_up")
        ? [runRow(10, "ctx_unrelated")]
        : []
    );

    const chain = await resolveLogbookChain(hass, effect, {}, fetch);

    expect(chain.runRow).toBeUndefined();
    expect(chain.rows).toEqual([effect]);
    expect(chain.syntheticRun?.type).toBe("automation");
    expect(chain.origins).toEqual([]);
  });

  it("keeps a direct user action as the only origin", async () => {
    const direct = entry({
      when: 5,
      entity_id: "light.ceiling",
      state: "on",
      context_user_id: "user_1",
      context_event_type: "call_service",
      context_domain: "light",
      context_service: "turn_on",
    });
    const { fetch, calls } = makeFetcher(() => []);

    const chain = await resolveLogbookChain(
      hass,
      direct,
      { userIdToName: USERS },
      fetch
    );

    expect(calls).toHaveLength(0);
    expect(chain.rows).toEqual([direct]);
    expect(chain.origins).toHaveLength(1);
    expect(chain.origins[0].type).toBe("user");
    expect(chain.origins[0].name).toBe("Alice");
    expect(chain.syntheticRun).toBeUndefined();
  });

  it("picks the last trigger state before the run, even minutes earlier", async () => {
    const run = runRow(600, "ctx_run");
    const effect = { ...effectRow(601), context_id: "ctx_run" };
    const { fetch } = makeFetcher((entityIds, contextId) => {
      if (contextId === "ctx_run") {
        return [run, effect];
      }
      if (entityIds?.includes("binary_sensor.motion")) {
        return [
          entry({ when: 100, entity_id: "binary_sensor.motion", state: "on" }),
          entry({ when: 480, entity_id: "binary_sensor.motion", state: "off" }),
          entry({ when: 640, entity_id: "binary_sensor.motion", state: "on" }),
        ];
      }
      return [];
    });

    const chain = await resolveLogbookChain(hass, effect, {}, fetch);

    expect(chain.triggerRow?.when).toBe(480);
    expect(chain.triggerRow?.state).toBe("off");
  });

  it("prefers the clicked copy of the run row over the fetched one", async () => {
    const clicked = entry({
      when: 10,
      name: "Wake up",
      entity_id: "automation.wake_up",
      domain: "automation",
      context_id: "ctx_run",
      context_user_id: "user_1",
      context_event_type: "call_service",
      context_domain: "automation",
      context_service: "trigger",
    });
    const fetched = entry({
      when: 10,
      name: "Wake up",
      entity_id: "automation.wake_up",
      domain: "automation",
      context_id: "ctx_run",
    });
    const effect = { ...effectRow(11), context_id: "ctx_run" };
    const { fetch } = makeFetcher((_entityIds, contextId) =>
      contextId === "ctx_run" ? [fetched, effect] : []
    );

    const chain = await resolveLogbookChain(
      hass,
      clicked,
      { userIdToName: USERS },
      fetch
    );

    expect(chain.runRow).toBe(clicked);
    expect(chain.rows).toEqual([clicked, effect]);
    expect(chain.origins).toHaveLength(1);
    expect(chain.origins[0].type).toBe("user");
    expect(chain.origins[0].name).toBe("Alice");
  });

  it("surfaces the integration that triggered the run", async () => {
    const clicked = entry({
      when: 20,
      name: "Wake up",
      entity_id: "automation.wake_up",
      domain: "automation",
      context_id: "ctx_run",
      context_event_type: "call_service",
      context_domain: "homekit",
      context_service: "turn_on",
    });
    const fetched = entry({
      when: 20,
      name: "Wake up",
      entity_id: "automation.wake_up",
      domain: "automation",
      context_id: "ctx_run",
    });
    const effect = { ...effectRow(21), context_id: "ctx_run" };
    const { fetch } = makeFetcher((_entityIds, contextId) =>
      contextId === "ctx_run" ? [fetched, effect] : []
    );

    const chain = await resolveLogbookChain(hass, clicked, {}, fetch);

    expect(chain.runRow).toBe(clicked);
    expect(chain.origins).toHaveLength(1);
    expect(chain.origins[0].type).toBe("integration");
    expect(chain.origins[0].brandDomain).toBe("homekit");
  });

  it("keeps the user above a run row that does not carry one", async () => {
    const fetched = entry({
      when: 10,
      name: "Wake up",
      entity_id: "automation.wake_up",
      domain: "automation",
      context_id: "ctx_run",
    });
    const effect = {
      ...effectRow(11),
      context_id: "ctx_run",
      context_user_id: "user_1",
    };
    const { fetch } = makeFetcher((_entityIds, contextId) =>
      contextId === "ctx_run" ? [fetched, effect] : []
    );

    const chain = await resolveLogbookChain(
      hass,
      effect,
      { userIdToName: USERS },
      fetch
    );

    expect(chain.runRow).toBe(fetched);
    expect(chain.origins).toHaveLength(1);
    expect(chain.origins[0].type).toBe("user");
    expect(chain.origins[0].name).toBe("Alice");
  });

  it("does not stack the user twice when the run row resolves it", async () => {
    const fetched = entry({
      when: 10,
      name: "Wake up",
      entity_id: "automation.wake_up",
      domain: "automation",
      context_id: "ctx_run",
      context_user_id: "user_1",
    });
    const effect = {
      ...effectRow(11),
      context_id: "ctx_run",
      context_user_id: "user_1",
    };
    const { fetch } = makeFetcher((_entityIds, contextId) =>
      contextId === "ctx_run" ? [fetched, effect] : []
    );

    const chain = await resolveLogbookChain(
      hass,
      effect,
      { userIdToName: USERS },
      fetch
    );

    expect(chain.origins).toHaveLength(1);
    expect(chain.origins[0].type).toBe("user");
  });
});
