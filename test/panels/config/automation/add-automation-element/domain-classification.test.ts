import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import { getTriggerDomain } from "../../../../../src/data/trigger";
import type { TriggerDescriptions } from "../../../../../src/data/trigger";
import {
  calculateActiveSystemDomains,
  classifyDomain,
} from "../../../../../src/panels/config/automation/add-automation-element/domain-classification";

const manifest = (integration_type: string) =>
  ({ domain: "x", integration_type, is_built_in: true }) as any;

const entity = (entity_id: string, attributes = {}) =>
  ({ entity_id, state: "on", attributes }) as unknown as HassEntity;

describe("classifyDomain", () => {
  it("groups helpers under helpers", () => {
    expect(
      classifyDomain("input_boolean", manifest("helper"), { type: "trigger" })
    ).toBe("helper");
  });

  it("lists entity domains for triggers only when entities exist", () => {
    const options = {
      type: "trigger" as const,
      usedDomains: new Set(["light"]),
    };
    expect(classifyDomain("light", manifest("entity"), options)).toBe(
      "dynamic"
    );
    expect(classifyDomain("switch", manifest("entity"), options)).toBe(
      undefined
    );
    // some entity domains are always listed
    expect(classifyDomain("weather", manifest("entity"), options)).toBe(
      "dynamic"
    );
  });

  it("always lists entity domains for actions", () => {
    expect(
      classifyDomain("switch", manifest("entity"), {
        type: "action",
        usedDomains: new Set(),
      })
    ).toBe("dynamic");
  });

  it("lists system domains only when active", () => {
    expect(
      classifyDomain("zone", manifest("system"), {
        type: "condition",
        activeSystemDomains: new Set(["zone"]),
      })
    ).toBe("dynamic");
    expect(
      classifyDomain("zone", manifest("system"), {
        type: "condition",
        activeSystemDomains: new Set(),
      })
    ).toBe(undefined);
  });

  it("treats everything else as an integration", () => {
    expect(classifyDomain("hacs", undefined, { type: "trigger" })).toBe(
      "integration"
    );
    expect(classifyDomain("mqtt", manifest("hub"), { type: "trigger" })).toBe(
      "integration"
    );
  });
});

describe("calculateActiveSystemDomains", () => {
  const descriptions = {
    "battery.low": {
      fields: {},
      target: { entity: { domain: "sensor", device_class: "battery" } },
    },
    "zone.entered": {
      fields: {},
      target: { entity: [{ domain: "person" }] },
    },
    "light.turned_on": { fields: {}, target: { entity: { domain: "light" } } },
  } as unknown as TriggerDescriptions;
  const manifests = {
    battery: manifest("system"),
    zone: manifest("system"),
    light: manifest("entity"),
  };

  it("activates a system domain when an entity matches its target", () => {
    const { active } = calculateActiveSystemDomains(
      descriptions,
      manifests,
      getTriggerDomain,
      {
        "sensor.phone": entity("sensor.phone", { device_class: "battery" }),
        "light.kitchen": entity("light.kitchen"),
      },
      {},
      {}
    );
    expect([...active]).toEqual(["battery"]);
  });

  it("maps entity domains to the system domains covering them", () => {
    const { byEntityDomain } = calculateActiveSystemDomains(
      descriptions,
      manifests,
      getTriggerDomain,
      {},
      {},
      {}
    );
    expect(byEntityDomain.get("sensor")).toEqual(new Set(["battery"]));
    expect(byEntityDomain.get("person")).toEqual(new Set(["zone"]));
    // an entity domain with entities of its own is handled as used domain
    expect(byEntityDomain.has("light")).toBe(true);
  });

  it("skips entity domains that have entities of their own", () => {
    const { byEntityDomain } = calculateActiveSystemDomains(
      descriptions,
      manifests,
      getTriggerDomain,
      { "light.kitchen": entity("light.kitchen") },
      {},
      {}
    );
    expect(byEntityDomain.has("light")).toBe(false);
  });
});
