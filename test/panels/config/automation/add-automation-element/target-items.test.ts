import { describe, expect, it } from "vitest";
import { DYNAMIC_PREFIX } from "../../../../../src/data/automation";
import { getTargetSections } from "../../../../../src/panels/config/automation/add-automation-element/target-items";
import type { ElementSources } from "../../../../../src/panels/config/automation/add-automation-element/types";

const localize = ((key: string) => key) as any;

const sources = (type: ElementSources["type"]): ElementSources => ({
  type,
  localize,
  language: "en",
  services: {
    light: { turn_on: { name: "Turn on", description: "", fields: {} } },
    homeassistant: {
      restart: { name: "Restart", description: "", fields: {} },
    },
  } as any,
  triggerDescriptions: {},
  conditionDescriptions: {},
  manifests: {
    light: { integration_type: "entity" },
    sensor: { integration_type: "entity" },
    battery: { integration_type: "system" },
    input_boolean: { integration_type: "helper" },
  } as any,
});

const states = {
  "sensor.temperature": {
    entity_id: "sensor.temperature",
    state: "21.5",
    attributes: {},
  },
  "light.kitchen": { entity_id: "light.kitchen", state: "on", attributes: {} },
} as any;

const keysOf = (sections: { items: { key: string }[] }[]) =>
  sections.map((section) => section.items.map((item) => item.key));

describe("getTargetSections", () => {
  it("merges system domain elements into the selected entity's domain", () => {
    const sections = getTargetSections(
      sources("trigger"),
      { entity_id: "sensor.temperature" },
      ["sensor.changed", "battery.low"],
      states,
      { type: "trigger" }
    );
    expect(keysOf(sections)).toEqual([
      [`${DYNAMIC_PREFIX}battery.low`, `${DYNAMIC_PREFIX}sensor.changed`],
      // the entity group, with numeric state for a numeric entity
      ["state", "numeric_state"],
    ]);
  });

  it("offers numeric state only for numeric entities", () => {
    const sections = getTargetSections(
      sources("condition"),
      { entity_id: "light.kitchen" },
      [],
      states,
      { type: "condition" }
    );
    expect(keysOf(sections)).toEqual([["state"]]);
  });

  it("keeps system domain elements apart for targets other than entities", () => {
    const sections = getTargetSections(
      sources("trigger"),
      { area_id: "kitchen" },
      ["sensor.changed", "battery.low"],
      states,
      { type: "trigger" }
    );
    expect(sections.map((section) => section.title)).toEqual([
      "component.battery.title",
      "component.sensor.title",
    ]);
  });

  it("leaves out the generic homeassistant services", () => {
    const sections = getTargetSections(
      sources("action"),
      { entity_id: "light.kitchen" },
      ["light.turn_on", "homeassistant.restart"],
      states,
      { type: "action" }
    );
    expect(sections).toEqual([
      expect.objectContaining({
        items: [
          expect.objectContaining({
            key: `${DYNAMIC_PREFIX}light.turn_on`,
            // the section title already names the domain
            name: "component.light.services.turn_on.name",
          }),
        ],
      }),
    ]);
  });

  it("sorts helper domains after entity domains", () => {
    const sections = getTargetSections(
      sources("trigger"),
      { area_id: "kitchen" },
      ["input_boolean.turned_on", "light.turned_on"],
      states,
      { type: "trigger", usedDomains: new Set(["light"]) }
    );
    expect(sections.map((section) => section.title)).toEqual([
      "component.light.title",
      "component.input_boolean.title",
    ]);
  });
});
