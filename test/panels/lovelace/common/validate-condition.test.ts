import { describe, it, expect } from "vitest";
import type { VisibilityCondition } from "../../../../src/panels/lovelace/common/validate-condition";
import {
  addEntityToCondition,
  checkConditionsMet,
  validateConditionalConfig,
} from "../../../../src/panels/lovelace/common/validate-condition";
import type { HomeAssistant } from "../../../../src/types";

const createMockHass = (states: Record<string, { state: string }> = {}) =>
  ({
    states,
    user: { id: "user1" },
  }) as unknown as HomeAssistant;

describe("validateConditionalConfig", () => {
  describe("state condition validation", () => {
    it("should return true for valid state condition", () => {
      const conditions = [
        { condition: "state", entity: "sensor.test", state: "on" },
      ] as any;
      expect(validateConditionalConfig(conditions)).toBe(true);
    });

    it("should return false for state condition without state or state_not", () => {
      const conditions = [{ condition: "state", entity: "sensor.test" }] as any;
      expect(validateConditionalConfig(conditions)).toBe(false);
    });
  });

  describe("numeric_state condition validation", () => {
    it("should return true for valid numeric_state condition", () => {
      const conditions = [
        { condition: "numeric_state", entity: "sensor.test", above: 0 },
      ] as any;
      expect(validateConditionalConfig(conditions)).toBe(true);
    });
  });

  describe("server-evaluated condition validation", () => {
    it("should accept server-evaluated conditions, leaving them to core", () => {
      const conditions = [
        { condition: "template", value_template: "{{ true }}" },
        { condition: "sun", after: "sunset" },
        {
          condition: "zone",
          entity_id: "device_tracker.me",
          zone: "zone.home",
        },
        {
          condition: "device",
          device_id: "abc",
          domain: "light",
          type: "is_on",
        },
      ] as any;
      expect(validateConditionalConfig(conditions)).toBe(true);
    });
  });
});

describe("checkConditionsMet", () => {
  describe("state condition evaluation", () => {
    it("should return true when state matches", () => {
      const hass = createMockHass({
        "sensor.test": { state: "on" },
      });
      const conditions = [
        { condition: "state", entity: "sensor.test", state: "on" },
      ] as any;
      expect(checkConditionsMet(conditions, hass, {})).toBe(true);
    });

    it("should return false when state does not match", () => {
      const hass = createMockHass({
        "sensor.test": { state: "off" },
      });
      const conditions = [
        { condition: "state", entity: "sensor.test", state: "on" },
      ] as any;
      expect(checkConditionsMet(conditions, hass, {})).toBe(false);
    });

    it("should return false for condition without state or state_not", () => {
      const hass = createMockHass({
        "sensor.test": { state: "on" },
      });
      const conditions = [{ condition: "state", entity: "sensor.test" }] as any;
      expect(checkConditionsMet(conditions, hass, {})).toBe(false);
    });

    it("should not crash with invalid condition type", () => {
      const hass = createMockHass({
        "sensor.test": { state: "5" },
      });
      const conditions = [
        { condition: "numeric", entity: "sensor.test", above: 0 },
      ] as any;
      // Should not throw - this was the bug
      expect(() => checkConditionsMet(conditions, hass, {})).not.toThrow();
      expect(checkConditionsMet(conditions, hass, {})).toBe(false);
    });
  });

  describe("numeric_state condition evaluation", () => {
    it("should return true when value is above threshold", () => {
      const hass = createMockHass({
        "sensor.test": { state: "5" },
      });
      const conditions = [
        { condition: "numeric_state", entity: "sensor.test", above: 0 },
      ] as any;
      expect(checkConditionsMet(conditions, hass, {})).toBe(true);
    });
  });

  describe("legacy conditions", () => {
    it("should handle legacy state condition", () => {
      const hass = createMockHass({
        "sensor.test": { state: "on" },
      });
      const conditions = [{ entity: "sensor.test", state: "on" }] as any;
      expect(checkConditionsMet(conditions, hass, {})).toBe(true);
    });

    it("should return false for legacy condition without state", () => {
      const hass = createMockHass({
        "sensor.test": { state: "on" },
      });
      const conditions = [{ entity: "sensor.test" }] as any;
      expect(checkConditionsMet(conditions, hass, {})).toBe(false);
    });
  });

  describe("location condition evaluation", () => {
    const createLocationHass = (state: string, inZones: string[]) =>
      ({
        states: {
          "person.me": {
            entity_id: "person.me",
            state,
            attributes: { user_id: "user1", in_zones: inZones },
          },
          "zone.store_1": { entity_id: "zone.store_1", state: "1" },
          "zone.store_2": { entity_id: "zone.store_2", state: "0" },
          "zone.work": { entity_id: "zone.work", state: "0" },
        },
        entities: {
          "zone.store_1": { entity_id: "zone.store_1", labels: ["store"] },
          "zone.store_2": { entity_id: "zone.store_2", labels: ["store"] },
          "zone.work": { entity_id: "zone.work", labels: [] },
        },
        devices: {},
        areas: {},
        user: { id: "user1" },
      }) as unknown as HomeAssistant;

    it("matches locations against the person state", () => {
      const hass = createLocationHass("Store", ["zone.store_1"]);
      expect(
        checkConditionsMet(
          [{ condition: "location", locations: ["Store"] }],
          hass,
          {}
        )
      ).toBe(true);
    });

    it("matches a zone label against in_zones", () => {
      const hass = createLocationHass("Store", ["zone.store_1"]);
      expect(
        checkConditionsMet(
          [{ condition: "location", target: { label_id: "store" } }],
          hass,
          {}
        )
      ).toBe(true);
    });

    it("matches a zone that is not the active zone", () => {
      // Active zone is the smaller "Work" zone inside the store zone.
      const hass = createLocationHass("Work", ["zone.work", "zone.store_2"]);
      expect(
        checkConditionsMet(
          [{ condition: "location", target: { entity_id: "zone.store_2" } }],
          hass,
          {}
        )
      ).toBe(true);
    });

    it("does not match when the person is in no selected zone", () => {
      const hass = createLocationHass("Work", ["zone.work"]);
      expect(
        checkConditionsMet(
          [{ condition: "location", target: { label_id: "store" } }],
          hass,
          {}
        )
      ).toBe(false);
    });

    it("matches away when the person is not in any zone", () => {
      const hass = createLocationHass("not_home", []);
      const conditions = [
        { condition: "location", target: { label_id: "store" }, away: true },
      ] as any;
      expect(checkConditionsMet(conditions, hass, {})).toBe(true);
      expect(
        checkConditionsMet(
          [{ condition: "location", target: { label_id: "store" } }],
          hass,
          {}
        )
      ).toBe(false);
    });
  });
});

describe("addEntityToCondition", () => {
  const cond = (c: any): VisibilityCondition => c as VisibilityCondition;

  it("stamps the host entity on lovelace state conditions, including the legacy shape", () => {
    // Entity-less conditions used to resolve through the evaluation context;
    // the server translation has no context, so the entity must be folded in
    // here — also for the legacy `{ state }` shape without a `condition` key.
    expect(
      addEntityToCondition(cond({ condition: "state", state: "on" }), "light.a")
    ).toEqual({ entity: "light.a", condition: "state", state: "on" });
    expect(addEntityToCondition(cond({ state: "on" }), "light.a")).toEqual({
      entity: "light.a",
      state: "on",
    });
    // an empty entity is "none" for the legacy evaluator (`entity || context`)
    expect(
      addEntityToCondition(
        cond({ condition: "state", entity: "", state: "on" }),
        "light.a"
      )
    ).toEqual({ condition: "state", entity: "light.a", state: "on" });
    expect(
      addEntityToCondition(
        cond({ condition: "numeric_state", above: 1 }),
        "light.a"
      )
    ).toEqual({ entity: "light.a", condition: "numeric_state", above: 1 });
  });

  it("keeps an explicit entity and leaves core-format and other conditions alone", () => {
    expect(
      addEntityToCondition(
        cond({ condition: "state", entity: "light.b", state: "on" }),
        "light.a"
      )
    ).toEqual({ condition: "state", entity: "light.b", state: "on" });
    const core = cond({
      condition: "state",
      entity_id: "light.b",
      state: "on",
    });
    expect(addEntityToCondition(core, "light.a")).toBe(core);
    const template = cond({ condition: "template", value_template: "{{ 1 }}" });
    expect(addEntityToCondition(template, "light.a")).toBe(template);
  });

  it("recurses into logical conditions", () => {
    expect(
      addEntityToCondition(
        cond({
          condition: "not",
          conditions: [{ state: "on" }, { condition: "user", users: ["u"] }],
        }),
        "light.a"
      )
    ).toEqual({
      condition: "not",
      conditions: [
        { entity: "light.a", state: "on" },
        { condition: "user", users: ["u"] },
      ],
    });
  });
});
