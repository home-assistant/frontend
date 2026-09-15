import { describe, expect, it } from "vitest";
import type {
  AutomationConfig,
  Condition,
  Trigger,
  TriggerCondition,
} from "../../../../../src/data/automation";
import {
  assignGeneratedTriggerIds,
  cleanupRemovedGeneratedTriggerReferences,
  cleanupUnusedGeneratedTriggerIds,
  GENERATED_TRIGGER_ID_PREFIX,
  getExplicitTriggerIds,
  getTriggerIdOptions,
  isGeneratedTriggerId,
  makeDuplicateTriggerIdsUnique,
  stripGeneratedTriggerIds,
  updateTriggerCondition,
} from "../../../../../src/panels/config/automation/trigger/automation-trigger-id";
import type { Action } from "../../../../../src/data/script";

const GENERATED_TRIGGER_ID_PATTERN = new RegExp(
  `^${GENERATED_TRIGGER_ID_PREFIX}[A-Za-z0-9_-]{4}$`
);

describe("automation trigger IDs", () => {
  it("creates generated trigger ID options that do not collide with existing IDs", () => {
    const triggers: Trigger[] = [
      { trigger: "state", entity_id: "light.kitchen" },
      { trigger: "time", at: "12:00:00" },
      {
        trigger: "event",
        event_type: "homeassistant_start",
        id: `${GENERATED_TRIGGER_ID_PREFIX}aB3x`,
      },
    ];

    const options = getTriggerIdOptions(triggers);

    expect(options).toHaveLength(3);
    expect(options[0].id).toMatch(GENERATED_TRIGGER_ID_PATTERN);
    expect(options[1].id).toMatch(GENERATED_TRIGGER_ID_PATTERN);
    expect(options[0].id).not.toBe(options[1].id);
    expect(options.map(({ draft, index }) => ({ draft, index }))).toEqual([
      { draft: true, index: 0 },
      { draft: true, index: 1 },
      { draft: false, index: 2 },
    ]);
    expect(options[2].id).toBe(`${GENERATED_TRIGGER_ID_PREFIX}aB3x`);
  });

  it("stores a generated ID on the selected trigger", () => {
    const triggers: Trigger[] = [
      { trigger: "state", entity_id: "light.kitchen" },
      { trigger: "time", at: "12:00:00" },
    ];
    const options = getTriggerIdOptions(triggers);
    const selectedId = options[1].id;

    const updated = assignGeneratedTriggerIds(
      triggers,
      options,
      selectedId
    ) as Trigger[];

    expect(updated[0]).toBe(triggers[0]);
    expect(updated[1]).toEqual({
      trigger: "time",
      at: "12:00:00",
      id: selectedId,
    });
  });

  it("updates only the selected nested condition and preserves shorthand and row fields", () => {
    const original: TriggerCondition = {
      condition: "trigger",
      id: "",
      alias: "Selected",
    };
    const other: TriggerCondition = { ...original };
    // Shorthand conditions are supported YAML, although Condition models the expanded form.
    const config: AutomationConfig = {
      triggers: [{ trigger: "event", event_type: "test" }],
      conditions: [other],
      actions: [
        {
          choose: [
            {
              conditions: [{ or: [original, other] } as unknown as Condition],
              sequence: [],
            },
          ],
        },
      ],
    };
    const options = getTriggerIdOptions(config.triggers);
    const id = options[0].id;
    const triggers = assignGeneratedTriggerIds(config.triggers, options, id);
    const updated = updateTriggerCondition(
      config,
      original,
      { ...original, id: [id] },
      triggers
    );

    expect(updated.triggers).toEqual([
      { trigger: "event", event_type: "test", id },
    ]);
    expect(updated.conditions).toEqual([other]);
    expect(updated.actions).toEqual([
      {
        choose: [
          {
            conditions: [{ or: [{ ...original, id: [id] }, other] }],
            sequence: [],
          },
        ],
      },
    ]);
    expect(original.id).toBe("");
    expect(config.triggers).toEqual([{ trigger: "event", event_type: "test" }]);
  });

  it("updates nested blocks without modifying templates, payloads, or the input", () => {
    const original: TriggerCondition = { condition: "trigger", id: "old" };
    const updated: TriggerCondition = { ...original, id: "new" };
    const template = "{{ trigger.id == 'old' }}";
    const payload: Action = {
      action: "test.send",
      data: { condition: original, sequence: [original], parallel: [original] },
    };
    // Use the same structure for input and expected output, replacing only the
    // condition placed in schema-defined fields. The payload must remain intact.
    const nestedActions = (condition: TriggerCondition): Action[] => [
      {
        choose: { conditions: [condition], sequence: condition },
        default: condition,
      },
      { choose: [{ conditions: template, sequence: condition }] },
      { if: [condition], then: condition, else: condition },
      { if: template, then: condition },
      { repeat: { while: [condition], sequence: condition } },
      { repeat: { until: [condition], sequence: condition } },
      { repeat: { count: 2, sequence: condition } },
      { sequence: [condition] },
      { parallel: condition },
      {
        condition: "and",
        conditions: [{ condition: "not", conditions: [condition] }],
      },
      payload,
    ];
    const config: AutomationConfig = {
      triggers: [],
      conditions: [],
      actions: nestedActions(original),
    };

    const result = updateTriggerCondition(
      config,
      original,
      updated,
      config.triggers
    );

    expect(result.actions).toEqual(nestedActions(updated));
    expect(config.actions).toEqual(nestedActions(original));
    expect(result.actions).toContain(payload);
  });

  it("removes deleted generated trigger IDs from trigger conditions", () => {
    const config: AutomationConfig = {
      triggers: [{ trigger: "time", at: "12:00:00", id: "manual-id" }],
      conditions: [
        {
          condition: "trigger",
          id: [`${GENERATED_TRIGGER_ID_PREFIX}aB3x`, "manual-id"],
        },
      ],
      actions: [
        {
          condition: "trigger",
          id: `${GENERATED_TRIGGER_ID_PREFIX}aB3x`,
        } as Action,
      ],
    };

    expect(
      cleanupRemovedGeneratedTriggerReferences(
        config,
        new Set([`${GENERATED_TRIGGER_ID_PREFIX}aB3x`])
      )
    ).toMatchObject({
      conditions: [{ condition: "trigger", id: ["manual-id"] }],
      actions: [{ condition: "trigger", id: "" }],
    });
  });

  it("removes dangling generated references when no triggers remain", () => {
    const generatedId = `${GENERATED_TRIGGER_ID_PREFIX}aB3x`;
    const config: AutomationConfig = {
      triggers: [],
      conditions: [
        {
          condition: "trigger",
          id: generatedId,
        },
      ],
      actions: [],
    };

    expect(
      cleanupRemovedGeneratedTriggerReferences(config, new Set([generatedId]))
    ).toMatchObject({
      conditions: [{ condition: "trigger", id: "" }],
    });
  });

  it("keeps a dangling generated reference during unrelated cleanup", () => {
    const generatedId = `${GENERATED_TRIGGER_ID_PREFIX}aB3x`;
    const config: AutomationConfig = {
      triggers: [],
      conditions: [{ condition: "trigger", id: generatedId }],
      actions: [],
    };

    expect(cleanupUnusedGeneratedTriggerIds(config)).toBe(config);
  });

  it("keeps manual dangling trigger IDs when triggers are removed", () => {
    const config: AutomationConfig = {
      triggers: [],
      conditions: [
        {
          condition: "trigger",
          id: "manual",
        },
      ],
      actions: [],
    };

    expect(
      cleanupRemovedGeneratedTriggerReferences(config, new Set(["manual"]))
    ).toMatchObject({
      conditions: [{ condition: "trigger", id: "manual" }],
    });
  });

  it("migrates duplicate trigger IDs to unique generated IDs", () => {
    const config: AutomationConfig = {
      triggers: [
        { trigger: "state", entity_id: "light.kitchen", id: "motion" },
        { trigger: "time", at: "12:00:00", id: "motion" },
        { trigger: "event", event_type: "homeassistant_start", id: "manual" },
      ],
      conditions: [{ condition: "trigger", id: "motion" }],
      actions: [
        {
          if: [{ condition: "trigger", id: ["motion", "manual"] }],
          then: [],
        },
      ],
    };

    const updated = makeDuplicateTriggerIdsUnique(config);
    const updatedTriggers = updated.triggers as Trigger[];
    const triggerIds = updatedTriggers.map((trigger) =>
      "id" in trigger ? trigger.id : undefined
    );

    expect(triggerIds[0]).toMatch(GENERATED_TRIGGER_ID_PATTERN);
    expect(triggerIds[1]).toMatch(GENERATED_TRIGGER_ID_PATTERN);
    expect(triggerIds[0]).not.toBe(triggerIds[1]);
    expect(triggerIds[2]).toBe("manual");
    expect(updated.conditions).toEqual([
      {
        condition: "trigger",
        id: [triggerIds[0], triggerIds[1]],
      },
    ]);
    expect(updated.actions).toMatchObject([
      {
        if: [
          {
            condition: "trigger",
            id: [triggerIds[0], triggerIds[1], "manual"],
          },
        ],
      },
    ]);
  });

  it("removes generated trigger IDs that no condition or action references", () => {
    const generatedA = `${GENERATED_TRIGGER_ID_PREFIX}aB3x`;
    const generatedB = `${GENERATED_TRIGGER_ID_PREFIX}yZ7w`;
    const config: AutomationConfig = {
      triggers: [
        { trigger: "state", entity_id: "light.kitchen", id: generatedA },
        { trigger: "time", at: "12:00:00", id: generatedB },
        { trigger: "event", event_type: "homeassistant_start", id: "manual" },
      ],
      conditions: [{ condition: "trigger", id: generatedA }],
      actions: [],
    };

    expect(cleanupUnusedGeneratedTriggerIds(config)).toEqual({
      ...config,
      triggers: [
        { trigger: "state", entity_id: "light.kitchen", id: generatedA },
        { trigger: "time", at: "12:00:00" },
        { trigger: "event", event_type: "homeassistant_start", id: "manual" },
      ],
    });
  });

  it("preserves generated trigger IDs still referenced by another condition", () => {
    const generatedId = `${GENERATED_TRIGGER_ID_PREFIX}aB3x`;
    const config: AutomationConfig = {
      triggers: [
        { trigger: "state", entity_id: "light.kitchen", id: generatedId },
      ],
      conditions: [
        { condition: "trigger", id: "" },
        { condition: "trigger", id: generatedId },
      ],
      actions: [],
    };

    expect(cleanupUnusedGeneratedTriggerIds(config)).toBe(config);
  });

  it("preserves manual trigger IDs even when no condition references them", () => {
    const config: AutomationConfig = {
      triggers: [
        { trigger: "state", entity_id: "light.kitchen", id: "manual" },
      ],
      conditions: [{ condition: "trigger", id: "" }],
      actions: [],
    };

    expect(cleanupUnusedGeneratedTriggerIds(config)).toBe(config);
  });

  it("strips generated trigger IDs but keeps manual IDs on paste/duplicate", () => {
    const generatedId = `${GENERATED_TRIGGER_ID_PREFIX}aB3x`;
    const trigger = {
      trigger: "state" as const,
      entity_id: "light.kitchen",
      id: generatedId,
    };

    expect(stripGeneratedTriggerIds(trigger)).toEqual({
      trigger: "state",
      entity_id: "light.kitchen",
    });
    expect(
      stripGeneratedTriggerIds({
        trigger: "state",
        entity_id: "light.kitchen",
        id: "manual",
      })
    ).toEqual({
      trigger: "state",
      entity_id: "light.kitchen",
      id: "manual",
    });
  });

  it("strips generated IDs recursively from trigger lists", () => {
    const generatedId = `${GENERATED_TRIGGER_ID_PREFIX}aB3x`;
    const list: Trigger = {
      trigger: "list" as const,
      triggers: [
        { trigger: "state", entity_id: "light.kitchen", id: generatedId },
        { trigger: "time", at: "12:00:00" },
      ],
    };

    expect(stripGeneratedTriggerIds(list)).toEqual({
      trigger: "list",
      triggers: [
        { trigger: "state", entity_id: "light.kitchen" },
        { trigger: "time", at: "12:00:00" },
      ],
    });
  });

  it("collects only generated trigger IDs when stripping for paste", () => {
    const generatedA = `${GENERATED_TRIGGER_ID_PREFIX}aB3x`;
    const generatedB = `${GENERATED_TRIGGER_ID_PREFIX}yZ7w`;
    const triggers: Trigger[] = [
      { trigger: "state", entity_id: "light.kitchen", id: generatedA },
      { trigger: "time", at: "12:00:00", id: "manual" },
      { trigger: "event", event_type: "homeassistant_start", id: generatedB },
    ];

    expect(
      new Set(getExplicitTriggerIds(triggers).filter(isGeneratedTriggerId))
    ).toEqual(new Set([generatedA, generatedB]));
  });

  it("cleans pasted trigger conditions when their generated IDs are stripped", () => {
    const generatedA = `${GENERATED_TRIGGER_ID_PREFIX}aB3x`;
    const generatedB = `${GENERATED_TRIGGER_ID_PREFIX}yZ7w`;
    const pastedTriggers: Trigger[] = [
      { trigger: "state", entity_id: "light.kitchen", id: generatedA },
      { trigger: "event", event_type: "homeassistant_start", id: generatedB },
    ];
    const config: AutomationConfig = {
      triggers: pastedTriggers,
      conditions: [{ condition: "trigger", id: generatedA }],
      actions: [
        {
          if: [{ condition: "trigger", id: [generatedA, generatedB] }],
          then: [],
        },
      ],
    };
    const strippedIds = new Set(
      getExplicitTriggerIds(pastedTriggers).filter(isGeneratedTriggerId)
    );

    expect(strippedIds.size).toBe(2);
    const cleaned = cleanupRemovedGeneratedTriggerReferences(
      config,
      strippedIds
    );
    expect(cleaned.conditions).toEqual([{ condition: "trigger", id: "" }]);
    expect(cleaned.actions).toEqual([
      { if: [{ condition: "trigger", id: [] }], then: [] },
    ]);
    expect(cleaned.triggers).toBe(config.triggers);
  });
});
