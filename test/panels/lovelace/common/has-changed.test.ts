import { describe, expect, it } from "vitest";
import { hasConfigOrEntitiesChanged } from "../../../../src/panels/lovelace/common/has-changed";
import type { HomeAssistant } from "../../../../src/types";

const state = (entity_id: string, value: string) => ({
  entity_id,
  state: value,
  attributes: {},
  last_changed: "",
  last_updated: "",
  context: { id: "" },
});

// Shared references for everything hasConfigChanged compares, so that only
// the `states` differences drive the result in these tests.
const SHARED = {
  connected: true,
  entities: {},
  config: { state: "RUNNING" },
  themes: {},
  locale: {},
  localize: () => "",
  formatEntityState: () => "",
  formatEntityAttributeName: () => "",
  formatEntityAttributeValue: () => "",
};

const createHass = (states: Record<string, any>): HomeAssistant =>
  ({ ...SHARED, states }) as unknown as HomeAssistant;

const changedProps = (oldHass: HomeAssistant) =>
  new Map([["hass", oldHass]]) as any;

describe("hasConfigOrEntitiesChanged", () => {
  it("returns true when a configured entity's state changes", () => {
    const oldHass = createHass({
      "light.a": state("light.a", "on"),
      "light.b": state("light.b", "on"),
    });
    const newHass = createHass({
      "light.a": state("light.a", "off"),
      "light.b": oldHass.states["light.b"],
    });
    const element = {
      hass: newHass,
      _config: { entities: ["light.a", "light.b"] },
    };
    expect(hasConfigOrEntitiesChanged(element, changedProps(oldHass))).toBe(
      true
    );
  });

  it("returns false when only unconfigured entities change", () => {
    const sharedA = state("light.a", "on");
    const oldHass = createHass({
      "light.a": sharedA,
      "light.other": state("light.other", "on"),
    });
    const newHass = createHass({
      "light.a": sharedA,
      "light.other": state("light.other", "off"),
    });
    const element = {
      hass: newHass,
      _config: { entities: ["light.a"] },
    };
    expect(hasConfigOrEntitiesChanged(element, changedProps(oldHass))).toBe(
      false
    );
  });

  it("keeps detecting changes across repeated calls (cached config parsing)", () => {
    const config = { entities: ["light.a"] };
    const base = state("light.a", "on");
    const hass1 = createHass({ "light.a": base });

    // First call: config parsed and cached.
    expect(
      hasConfigOrEntitiesChanged(
        { hass: hass1, _config: config },
        changedProps(hass1)
      )
    ).toBe(false);

    // Second call with a real change still detected (cache must not mask it).
    const hass2 = createHass({ "light.a": state("light.a", "off") });
    expect(
      hasConfigOrEntitiesChanged(
        { hass: hass2, _config: config },
        changedProps(hass1)
      )
    ).toBe(true);
  });
});
