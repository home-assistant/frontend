import { describe, expect, test, vi } from "vitest";

import "../../../../src/panels/config/automation/ha-automation-editor";
import type { HaAutomationEditor } from "../../../../src/panels/config/automation/ha-automation-editor";
import "../../../../src/panels/config/script/ha-script-editor";
import type { HaScriptEditor } from "../../../../src/panels/config/script/ha-script-editor";
import { createMockHass } from "../../../fixtures/hass";

const AUTOMATION = {
  id: "kitchen",
  alias: "Kitchen",
  triggers: [{ trigger: "state", entity_id: "light.kitchen", to: "on" }],
  conditions: [],
  actions: [
    {
      action: "light.turn_on",
      target: { entity_id: "light.hall" },
      data: { brightness: 255 },
    },
  ],
  mode: "single",
};

const SCRIPT = {
  alias: "Hall",
  sequence: [
    {
      action: "light.turn_on",
      target: { entity_id: "light.hall" },
      data: { brightness: 255 },
    },
  ],
  mode: "single",
};

// Same action with the data block moved above target, like Alt+Up in YAML
const reorderAction = (action: (typeof SCRIPT.sequence)[number]) => ({
  action: action.action,
  data: action.data,
  target: action.target,
});

const loadEditor = async <T extends HaAutomationEditor | HaScriptEditor>(
  tag: "ha-automation-editor" | "ha-script-editor",
  config: unknown
): Promise<T> => {
  const el = document.createElement(tag) as T;
  const hass = createMockHass();
  (hass as any).callApi = vi.fn(async () => structuredClone(config));
  el.hass = hass;
  Object.defineProperty(el, "isConnected", {
    configurable: true,
    get: () => true,
  });
  await (el as any).loadConfig("kitchen");
  return el;
};

const editYaml = (el: HaAutomationEditor | HaScriptEditor, value: unknown) =>
  (el as any)._yamlChanged({
    stopPropagation: () => undefined,
    detail: { isValid: true, value },
  });

describe("YAML editor dirty state", () => {
  test("automation editor is dirty when keys are only reordered", async () => {
    const el = await loadEditor<HaAutomationEditor>(
      "ha-automation-editor",
      AUTOMATION
    );
    const { id: _id, ...yaml } = structuredClone(AUTOMATION);

    editYaml(el, yaml);
    expect(el.isDirtyState).toBe(false);

    editYaml(el, { ...yaml, actions: [reorderAction(yaml.actions[0])] });
    expect(el.isDirtyState).toBe(true);
  });

  test("automation editor ignores where the hidden id was in the file", async () => {
    const { id, ...rest } = AUTOMATION;
    const el = await loadEditor<HaAutomationEditor>("ha-automation-editor", {
      ...rest,
      id,
    });
    const yaml = structuredClone(rest);

    editYaml(el, yaml);
    expect(el.isDirtyState).toBe(false);

    editYaml(el, { ...yaml, actions: [reorderAction(yaml.actions[0])] });
    expect(el.isDirtyState).toBe(true);

    editYaml(el, yaml);
    expect(el.isDirtyState).toBe(false);
  });

  test("script editor is dirty when keys are only reordered", async () => {
    const el = await loadEditor<HaScriptEditor>("ha-script-editor", SCRIPT);
    const yaml = structuredClone(SCRIPT);

    editYaml(el, yaml);
    expect(el.isDirtyState).toBe(false);

    editYaml(el, { ...yaml, sequence: [reorderAction(yaml.sequence[0])] });
    expect(el.isDirtyState).toBe(true);
  });
});
