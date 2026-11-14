import { describe, expect, it } from "vitest";
import type { LovelaceCardConfig } from "../../../../../src/data/lovelace/config/card";
import type { LovelaceSectionConfig } from "../../../../../src/data/lovelace/config/section";
import { HomeAreaViewStrategy } from "../../../../../src/panels/lovelace/strategies/home/home-area-view-strategy";
import type { HomeAssistant } from "../../../../../src/types";
import {
  mockArea,
  mockEntity,
} from "../../../../common/entity/context/context-mock";
import {
  createMockEntityState,
  createMockHass,
} from "../../../../fixtures/hass";

const createKitchenHass = (): HomeAssistant => ({
  ...createMockHass(
    {
      "light.ceiling": createMockEntityState("light.ceiling", "on"),
      "light.status_led": createMockEntityState("light.status_led", "off"),
    },
    {
      entities: {
        "light.ceiling": mockEntity({
          entity_id: "light.ceiling",
          area_id: "kitchen",
        }),
        "light.status_led": mockEntity({
          entity_id: "light.status_led",
          area_id: "kitchen",
        }),
      },
      areas: {
        kitchen: mockArea({ area_id: "kitchen", name: "Kitchen" }),
      },
    }
  ),
  panels: {},
});

describe("HomeAreaViewStrategy", () => {
  it("leaves hidden lights out of the Lights section and its buttons", async () => {
    const view = await HomeAreaViewStrategy.generate(
      {
        type: "home-area",
        area: "kitchen",
        light_hidden_entities: ["light.status_led"],
      },
      createKitchenHass()
    );

    const [heading, ...tiles] = (view.sections?.[0] as LovelaceSectionConfig)
      .cards!;
    expect(
      heading.badges.map((badge: LovelaceCardConfig) => badge.tap_action.target)
    ).toEqual([
      { entity_id: ["light.ceiling"] },
      { entity_id: ["light.ceiling"] },
    ]);
    expect(tiles.map((card) => card.entity)).toEqual(["light.ceiling"]);
  });
});
