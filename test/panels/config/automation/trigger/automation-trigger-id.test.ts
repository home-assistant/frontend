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
  getTriggerIdOptions,
  makeDuplicateTriggerIdsUnique,
  updateTriggerCondition,
} from "../../../../../src/panels/config/automation/trigger/automation-trigger-id";
import type { Action } from "../../../../../src/data/script";

const GENERATED_TRIGGER_ID_PATTERN = new RegExp(
  `^${GENERATED_TRIGGER_ID_PREFIX}[0-9A-HJKMNP-TV-Z]{26}$`
);

describe("automation trigger IDs", () => {
  it("creates generated trigger ID options that do not collide with existing IDs", () => {
    const triggers: Trigger[] = [
      { trigger: "state", entity_id: "light.kitchen" },
      { trigger: "time", at: "12:00:00" },
      {
        trigger: "event",
        event_type: "homeassistant_start",
        id: `${GENERATED_TRIGGER_ID_PREFIX}01K4P0Q7JZ6HYBRP7F86VW9RCD`,
      },
    ];

    const options = getTriggerIdOptions(triggers);

    expect(options).toHaveLength(3);
    expect(options[0].id).toMatch(GENERATED_TRIGGER_ID_PATTERN);
    expect(options[1].id).toMatch(GENERATED_TRIGGER_ID_PATTERN);
    expect(options[0].id).not.toBe(options[1].id);
    expect(
      options.map(({ generated, index }) => ({ generated, index }))
    ).toEqual([
      { generated: true, index: 0 },
      { generated: true, index: 1 },
      { generated: false, index: 2 },
    ]);
    expect(options[2].id).toBe(
      `${GENERATED_TRIGGER_ID_PREFIX}01K4P0Q7JZ6HYBRP7F86VW9RCD`
    );
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
          id: [
            `${GENERATED_TRIGGER_ID_PREFIX}01K4P0Q7JZ6HYBRP7F86VW9RCD`,
            "manual-id",
          ],
        },
      ],
      actions: [
        {
          condition: "trigger",
          id: `${GENERATED_TRIGGER_ID_PREFIX}01K4P0Q7JZ6HYBRP7F86VW9RCD`,
        } as Action,
      ],
    };

    expect(
      cleanupRemovedGeneratedTriggerReferences(
        config,
        new Set([`${GENERATED_TRIGGER_ID_PREFIX}01K4P0Q7JZ6HYBRP7F86VW9RCD`])
      )
    ).toMatchObject({
      conditions: [{ condition: "trigger", id: ["manual-id"] }],
      actions: [{ condition: "trigger", id: "" }],
    });
  });

  it("removes dangling generated references when no triggers remain", () => {
    const generatedId = `${GENERATED_TRIGGER_ID_PREFIX}01K4P0Q7JZ6HYBRP7F86VW9RCD`;
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
    const generatedId = `${GENERATED_TRIGGER_ID_PREFIX}01K4P0Q7JZ6HYBRP7F86VW9RCD`;
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
    const generatedA = `${GENERATED_TRIGGER_ID_PREFIX}01K4P0Q7JZ6HYBRP7F86VW9RCD`;
    const generatedB = `${GENERATED_TRIGGER_ID_PREFIX}01K4P0Q7JZ6HYBRP7F86VW9RD0`;
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
    const generatedId = `${GENERATED_TRIGGER_ID_PREFIX}01K4P0Q7JZ6HYBRP7F86VW9RCD`;
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
});
