import type { AutomationConfig } from "../../../src/data/automation";
import type { ScriptConfig } from "../../../src/data/script";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const demoAutomationConfig = (entityId: string): AutomationConfig => ({
  id: entityId.split(".")[1],
  alias: "Demo automation",
  description: "An example automation shown in the demo.",
  triggers: [
    { trigger: "state", entity_id: "binary_sensor.basement_floor_wet" },
  ],
  conditions: [],
  actions: [
    {
      action: "light.turn_on",
      target: { entity_id: "light.bed_light" },
    },
  ],
  mode: "single",
});

const demoScriptConfig = (): ScriptConfig => ({
  alias: "Demo script",
  description: "An example script shown in the demo.",
  sequence: [
    {
      action: "light.turn_on",
      target: { entity_id: "light.bed_light" },
    },
  ],
  mode: "single",
});

export const mockAutomation = (hass: MockHomeAssistant) => {
  hass.mockWS("automation/config", (msg: { entity_id: string }) => ({
    config: demoAutomationConfig(msg.entity_id),
  }));
  hass.mockWS("script/config", () => ({ config: demoScriptConfig() }));

  hass.mockAPI(/config\/automation\/config\/.+/, () =>
    demoAutomationConfig("automation.demo")
  );
  hass.mockAPI(/config\/script\/config\/.+/, () => demoScriptConfig());

  // Trigger/condition type pickers subscribe for integration-provided
  // platforms. The demo only uses the built-in ones, so emit empty records.
  hass.mockWS(
    "trigger_platforms/subscribe",
    (
      _msg,
      _hass,
      onChange?: (descriptions: Record<string, unknown>) => void
    ) => {
      onChange?.({});
      return () => undefined;
    }
  );
  hass.mockWS(
    "condition_platforms/subscribe",
    (
      _msg,
      _hass,
      onChange?: (descriptions: Record<string, unknown>) => void
    ) => {
      onChange?.({});
      return () => undefined;
    }
  );
};
