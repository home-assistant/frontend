import type { HomeAssistant } from "../../src/types";
import {
  computeLightAttributeService,
  type LightEntity,
} from "../../src/data/light";
import { describe, expect, it } from "vitest";

const createHass = (states: HomeAssistant["states"]) =>
  ({ states }) as HomeAssistant;

const createLight = (state: string, entityIds?: string[]) =>
  ({
    entity_id: "light.test_group",
    state,
    attributes: entityIds ? { entity_id: entityIds } : {},
  }) as LightEntity;

describe("computeLightAttributeService", () => {
  it("keeps turn_on for non-group lights", () => {
    expect(
      computeLightAttributeService(createHass({}), createLight("on"))
    ).toBe("turn_on");
  });

  it("uses adjust for active light groups", () => {
    expect(
      computeLightAttributeService(
        createHass({}),
        createLight("on", ["light.candela", "light.svet_na_stole"])
      )
    ).toBe("adjust");
  });

  it("uses adjust for partially-on all-mode light groups", () => {
    expect(
      computeLightAttributeService(
        createHass({
          "light.candela": {
            entity_id: "light.candela",
            state: "on",
            attributes: {},
          } as LightEntity,
          "light.svet_na_stole": {
            entity_id: "light.svet_na_stole",
            state: "off",
            attributes: {},
          } as LightEntity,
        }),
        createLight("off", ["light.candela", "light.svet_na_stole"])
      )
    ).toBe("adjust");
  });

  it("keeps turn_on for fully-off light groups", () => {
    expect(
      computeLightAttributeService(
        createHass({
          "light.candela": {
            entity_id: "light.candela",
            state: "off",
            attributes: {},
          } as LightEntity,
        }),
        createLight("off", ["light.candela"])
      )
    ).toBe("turn_on");
  });
});
