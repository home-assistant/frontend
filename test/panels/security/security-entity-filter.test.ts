import { describe, expect, it } from "vitest";
import { createSecurityEntityFilter } from "../../../src/panels/security/security-entity-filter";
import { createMockEntityState, createMockHass } from "../../fixtures/hass";

describe("createSecurityEntityFilter", () => {
  const hass = createMockHass();
  const stateObj = createMockEntityState("binary_sensor.glass_break", "off", {
    device_class: "glass_break",
  });
  hass.states[stateObj.entity_id] = stateObj;
  const registries = {
    entities: hass.entities,
    devices: hass.devices,
    areas: hass.areas,
    floors: hass.floors,
  };

  it("reads the latest states and registries", () => {
    let states: typeof hass.states | null = null;
    const filter = createSecurityEntityFilter(
      () => states,
      () => registries
    );
    expect(filter(stateObj)).toBe(false);
    states = hass.states;
    expect(filter(stateObj)).toBe(true);
  });

  it("rejects entities without registries", () => {
    const filter = createSecurityEntityFilter(
      () => hass.states,
      () => null
    );
    expect(filter(stateObj)).toBe(false);
  });
});
