import { describe, expect, it } from "vitest";
import type { AutomationConfig } from "../../../../../src/data/automation";
import {
  diffAutomationConfigs,
  diffMarkAt,
} from "../../../../../src/panels/config/automation/ai/automation-ai-diff";

const light = (service: string, entity = "light.kitchen") => ({
  action: `light.${service}`,
  target: { entity_id: entity },
});

const base = {
  alias: "Kitchen light",
  description: "",
  mode: "single",
  triggers: [{ trigger: "state", entity_id: "binary_sensor.motion", to: "on" }],
  conditions: [],
  actions: [light("turn_on"), { delay: { seconds: 5 } }, light("turn_off")],
} satisfies AutomationConfig;

// The editor shows the AI's changes from these marks before they are
// accepted, and shows removed rows from the merged config. Wrong paths would
// color the wrong rows, and a lost removed row would hide a deletion.
describe("diffAutomationConfigs", () => {
  it("finds no changes in an equal config", () => {
    const diff = diffAutomationConfigs(base, structuredClone(base));
    expect(diff.hasChanges).toBe(false);
    expect(diff.config).toEqual(base);
  });

  it("marks added, changed and removed rows and keeps removed rows", () => {
    const diff = diffAutomationConfigs(base, {
      ...base,
      actions: [
        { ...light("turn_on"), data: { brightness_pct: 50 } },
        light("turn_off"),
        { action: "notify.notify", data: { message: "Off" } },
      ],
    });

    expect(diff.config.actions).toEqual([
      { ...light("turn_on"), data: { brightness_pct: 50 } },
      { delay: { seconds: 5 } },
      light("turn_off"),
      { action: "notify.notify", data: { message: "Off" } },
    ]);
    expect(Object.fromEntries(diff.rows)).toEqual({
      "actions/0": "changed",
      "actions/1": "removed",
      "actions/3": "added",
    });
    expect(diff.fields.get("actions/0")).toEqual([
      {
        path: ["data"],
        mark: "added",
        oldValue: undefined,
        newValue: { brightness_pct: 50 },
      },
    ]);
  });

  it("marks rows inside building blocks at their path", () => {
    const before: AutomationConfig = {
      ...base,
      actions: [{ if: [], then: [light("turn_on")], else: [] }],
    };
    const diff = diffAutomationConfigs(before, {
      ...base,
      actions: [
        {
          if: [{ condition: "sun", after: "sunset" }],
          then: [light("turn_on", "light.hall")],
          else: [],
        },
      ],
    });

    expect(Object.fromEntries(diff.rows)).toEqual({
      "actions/0/if/0": "added",
      "actions/0/then/0": "changed",
    });
    // The block itself didn't change, only rows inside it
    expect(diffMarkAt(diff, ["actions", 0])).toBeUndefined();
    expect(diff.fields.get("actions/0/then/0")).toEqual([
      {
        path: ["target", "entity_id"],
        mark: "changed",
        oldValue: "light.kitchen",
        newValue: "light.hall",
      },
    ]);
  });

  it("marks rows inside an added or removed row with it", () => {
    const diff = diffAutomationConfigs(base, {
      ...base,
      actions: [
        ...base.actions,
        { repeat: { count: 2, sequence: [light("toggle")] } },
      ],
    });

    expect(diffMarkAt(diff, ["actions", 3])).toBe("added");
    expect(diffMarkAt(diff, ["actions", 3, "repeat", "sequence", 0])).toBe(
      "added"
    );
    expect(diffMarkAt(diff, ["actions", 0])).toBeUndefined();
  });

  it("takes a row of another kind as removed and added", () => {
    const diff = diffAutomationConfigs(base, {
      ...base,
      triggers: [{ trigger: "time", at: "07:00:00" }],
    });

    expect(diff.config.triggers).toEqual([
      base.triggers[0],
      { trigger: "time", at: "07:00:00" },
    ]);
    expect(Object.fromEntries(diff.rows)).toEqual({
      "triggers/0": "removed",
      "triggers/1": "added",
    });
  });

  it("marks changed settings", () => {
    const diff = diffAutomationConfigs(base, {
      ...base,
      alias: "Kitchen motion light",
      description: "Turns on the kitchen light on motion",
      mode: undefined,
    });

    expect(diff.settings).toEqual({
      alias: "changed",
      description: "added",
      mode: "removed",
    });
    expect(diff.rows.size).toBe(0);
  });
});
