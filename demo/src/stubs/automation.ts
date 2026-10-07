import type { AutomationConfig } from "../../../src/data/automation";
import type { ScriptConfig } from "../../../src/data/script";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { selectedDemoConfig } from "../configs/demo-configs";
import { mockAutomationPlatforms } from "./automation_platforms";

// Automations saved in the editor during this session
const savedAutomations: Record<string, AutomationConfig> = {};

const automationConfig = async (
  id: string | undefined
): Promise<AutomationConfig> => {
  if (id && id in savedAutomations) {
    return savedAutomations[id];
  }
  const { automations } = await selectedDemoConfig;
  const automation = automations?.find((a) => a.config.id === id);
  if (!automation) {
    throw new Error("Automation not found");
  }
  return automation.config;
};

const scriptConfig = (
  currentHass: MockHomeAssistant,
  entityId: string
): ScriptConfig => {
  const alias =
    currentHass.states[entityId]?.attributes.friendly_name ?? entityId;
  return {
    alias,
    sequence: [
      {
        action: "persistent_notification.create",
        data: { message: `${alias} ran` },
      },
    ],
    mode: "single",
  };
};

export const mockAutomation = (hass: MockHomeAssistant) => {
  hass.mockWS(
    "automation/config",
    async (msg: { entity_id: string }, currentHass: MockHomeAssistant) => ({
      config: await automationConfig(
        currentHass.states[msg.entity_id]?.attributes.id
      ),
    })
  );
  hass.mockAPI(
    /config\/automation\/config\/.+/,
    (_hass, method, path, parameters) => {
      const id = decodeURIComponent(path.split("/").pop()!);
      if (method === "POST") {
        savedAutomations[id] = parameters as AutomationConfig;
        return { result: "ok" };
      }
      return automationConfig(id);
    }
  );

  // Scripts do not have demo configs yet, show the script under its own name.
  hass.mockWS(
    "script/config",
    (msg: { entity_id: string }, currentHass: MockHomeAssistant) => ({
      config: scriptConfig(currentHass, msg.entity_id),
    })
  );
  hass.mockAPI(/config\/script\/config\/.+/, (currentHass, _method, path) =>
    scriptConfig(
      currentHass,
      `script.${decodeURIComponent(path.split("/").pop()!)}`
    )
  );

  mockAutomationPlatforms(hass);
};
