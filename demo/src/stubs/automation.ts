import type { AutomationConfig } from "../../../src/data/automation";
import type { ScriptConfig } from "../../../src/data/script";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { computeDomain } from "../../../src/common/entity/compute_domain";
import { automationEntity, selectedDemoConfig } from "../configs/demo-configs";
import type { DemoAutomation } from "../configs/types";
import { mockAutomationPlatforms } from "./automation_platforms";
import { addEntityRegistryEntry } from "./entity_registry";

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
    (currentHass, method, path, parameters) => {
      const id = decodeURIComponent(path.split("/").pop()!);
      if (method === "POST") {
        // Core stores the ID in the config
        const config = { ...(parameters as AutomationConfig), id };
        savedAutomations[id] = config;
        // Like core, update the automation entity, or add it for a new one
        const existing = Object.values(currentHass.states).find(
          (stateObj) =>
            computeDomain(stateObj.entity_id) === "automation" &&
            stateObj.attributes.id === id
        );
        const entity = automationEntity({
          config: { ...config, alias: config.alias || id },
          state: existing?.state as DemoAutomation["state"],
          icon: existing?.attributes.icon,
        });
        // A new automation gets a free entity ID, like core
        let entityId = existing?.entity_id ?? entity.entity_id;
        for (let i = 2; !existing && entityId in currentHass.states; i++) {
          entityId = `${entity.entity_id}_${i}`;
        }
        currentHass.addEntities({
          ...entity,
          entity_id: entityId,
          attributes: {
            ...entity.attributes,
            last_triggered: existing?.attributes.last_triggered ?? null,
          },
        });
        if (!existing) {
          addEntityRegistryEntry(currentHass, {
            entity_id: entityId,
            platform: "automation",
            unique_id: id,
          });
        }
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
