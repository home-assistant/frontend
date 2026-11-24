import { describe, expect, it, vi } from "vitest";
import type { AutomationConfig } from "../../../../../src/data/automation";
import type { ScriptConfig } from "../../../../../src/data/script";
import {
  runAutomationAi,
  type AiEditorConfig,
  type AiEditorKind,
} from "../../../../../src/panels/config/automation/ai/automation-ai-agent";
import type { HomeAssistant } from "../../../../../src/types";

// What the AI answers, one per request, and what the backend says of the
// config it validates
const fakeHass = (
  answers: unknown[],
  validate: (config: Record<string, unknown>) => Record<string, unknown>
) => {
  const callService = vi.fn(async () => ({
    response: { conversation_id: "conversation", data: answers.shift() },
  }));
  const callWS = vi.fn(async (message: Record<string, unknown>) =>
    validate(message)
  );
  const hass = {
    language: "en",
    states: {
      "light.kitchen": {
        entity_id: "light.kitchen",
        attributes: { friendly_name: "Kitchen light" },
      },
    },
    entities: {},
    devices: {},
    areas: {},
    services: { light: { turn_on: {} } },
    callService,
    callWS,
    // No trigger or condition platforms and no chat log, like an older core
    connection: {
      subscribeMessage: () => Promise.reject(new Error("unknown command")),
    },
  } as unknown as HomeAssistant;
  return { hass, callService, callWS };
};

const valid = { valid: true, error: null };

const run = (hass: HomeAssistant, kind: AiEditorKind, config: AiEditorConfig) =>
  runAutomationAi({
    hass,
    kind,
    config,
    prompt: "Turn on the kitchen light",
    history: [],
    onStep: () => undefined,
    onMessages: () => undefined,
  });

// The loop that asks the AI, checks its answer with the backend and lets it
// fix what the backend finds. A mistake here applies broken configs or
// gives up on answers it could fix.
describe("runAutomationAi", () => {
  const automation = {
    id: "1",
    alias: "Kitchen",
    triggers: [],
    conditions: [],
    actions: [],
  } as AutomationConfig;
  const yaml = [
    "```yaml",
    "id: other",
    "alias: Kitchen",
    "triggers: []",
    "conditions: []",
    "actions:",
    "  - action: light.turn_on",
    "    target:",
    "      entity_id: light.kitchen",
    "```",
  ].join("\n");

  it("takes a fenced answer and keeps the id of the config", async () => {
    const { hass } = fakeHass([{ summary: "Done", config_yaml: yaml }], () => ({
      triggers: valid,
      conditions: valid,
      actions: valid,
    }));
    const result = await run(hass, "automation", automation);
    expect(result.summary).toBe("Done");
    expect(result.problems).toEqual([]);
    expect((result.config as AutomationConfig).id).toBe("1");
    expect((result.config as AutomationConfig).actions).toHaveLength(1);
  });

  it("asks for a fix when the answer has no YAML", async () => {
    const { hass, callService } = fakeHass(
      [{ summary: "Oops" }, { summary: "Fixed", config_yaml: yaml }],
      () => ({ triggers: valid, conditions: valid, actions: valid })
    );
    const result = await run(hass, "automation", automation);
    expect(callService).toHaveBeenCalledTimes(2);
    expect(result.summary).toBe("Fixed");
  });

  it("returns the problems it couldn't fix after two attempts", async () => {
    const { hass, callService } = fakeHass(
      [1, 2, 3].map(() => ({ summary: "Done", config_yaml: yaml })),
      () => ({
        triggers: valid,
        conditions: valid,
        actions: { valid: false, error: "Unknown action" },
      })
    );
    const result = await run(hass, "automation", automation);
    expect(callService).toHaveBeenCalledTimes(3);
    expect(result.problems).toEqual(["actions: Unknown action"]);
  });

  it("gives up when the YAML never parses", async () => {
    const { hass } = fakeHass(
      [1, 2, 3].map(() => ({ summary: "Done", config_yaml: "a: [" })),
      () => ({})
    );
    await expect(run(hass, "automation", automation)).rejects.toThrow(
      "The YAML is invalid"
    );
  });

  it("validates the sequence of a script as actions", async () => {
    const { hass, callWS } = fakeHass(
      [1, 2, 3].map(() => ({
        summary: "Done",
        config_yaml:
          "alias: Movie\nsequence:\n  - action: light.turn_on\n    target:\n      entity_id: light.kitchen\n",
      })),
      () => ({ actions: { valid: false, error: "Bad" } })
    );
    const result = await run(hass, "script", {
      alias: "Movie",
      sequence: [],
    } as ScriptConfig);
    expect(callWS.mock.calls[0][0]).toEqual({
      type: "validate_config",
      actions: [
        { action: "light.turn_on", target: { entity_id: "light.kitchen" } },
      ],
    });
    // Under the name the AI knows it by
    expect(result.problems).toEqual(["sequence: Bad"]);
  });
});
