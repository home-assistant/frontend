import type { AutomationConfig } from "../../../src/data/automation";
import type { ScriptConfig } from "../../../src/data/script";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";
import { computeDomain } from "../../../src/common/entity/compute_domain";
import { slugify } from "../../../src/common/string/slugify";
import {
  automationEntity,
  demoAutomations,
  saveDemoAutomation,
  selectedDemo,
  selectedDemoConfig,
} from "../configs/demo-configs";
import type { DemoAutomation } from "../configs/types";
import { mockAutomationPlatforms } from "./automation_platforms";
import {
  addEntityRegistryEntry,
  getEntityRegistryEntry,
  removeEntityRegistryEntry,
} from "./entity_registry";

const automationConfig = async (
  id: string | undefined
): Promise<AutomationConfig> => {
  const automation = demoAutomations(
    selectedDemo,
    await selectedDemoConfig
  ).find((a) => a.config.id === id);
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
      const existing = Object.values(currentHass.states).find(
        (stateObj) =>
          computeDomain(stateObj.entity_id) === "automation" &&
          stateObj.attributes.id === id
      );
      if (method === "DELETE") {
        // Like core, remove the automation with its entity
        saveDemoAutomation(id, null);
        if (existing) {
          const { [existing.entity_id]: _state, ...states } =
            currentHass.states;
          const { [existing.entity_id]: _entity, ...entities } =
            currentHass.entities;
          currentHass.updateHass({ states, entities });
          // Otherwise a service call to it would add its state again
          delete currentHass.mockEntities[existing.entity_id];
          removeEntityRegistryEntry(currentHass, existing.entity_id);
        }
        return { result: "ok" };
      }
      if (method === "POST") {
        // Core stores the ID in the config
        const config = {
          ...(parameters as DemoAutomation["config"]),
          id,
        };
        config.alias ||= id;
        // Like core, update the automation entity, or add it for a new one
        // A new automation gets a free entity ID, like core
        const slug = `automation.${slugify(config.alias)}`;
        let entityId = existing?.entity_id ?? slug;
        for (let i = 2; !existing && entityId in currentHass.states; i++) {
          entityId = `${slug}_${i}`;
        }
        const lastTriggered = existing?.attributes.last_triggered;
        const automation: DemoAutomation = {
          config,
          entityId,
          state: existing?.state as DemoAutomation["state"],
          icon: existing?.attributes.icon,
          lastTriggered: lastTriggered
            ? (Date.now() - Date.parse(lastTriggered)) / 60000
            : undefined,
        };
        // Kept per demo, so it is still there after switching demos
        saveDemoAutomation(id, automation);
        // A display entry of a new automation is left over from another demo
        const display = existing ? currentHass.entities[entityId] : undefined;
        currentHass.addEntities(automationEntity(automation));
        // Adding the entity resets its display entry, keep what the registry
        // holds
        if (display) {
          const registryName = getEntityRegistryEntry(entityId)?.name;
          currentHass.entities[entityId] = {
            ...currentHass.entities[entityId],
            ...(registryName && { name: registryName }),
            area_id: display.area_id,
            labels: display.labels,
            icon: display.icon,
            hidden: display.hidden,
          };
        }
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
