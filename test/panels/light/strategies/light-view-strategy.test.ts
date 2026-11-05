import { describe, expect, it } from "vitest";
import type { LovelaceCardConfig } from "../../../../src/data/lovelace/config/card";
import type { LovelaceSectionConfig } from "../../../../src/data/lovelace/config/section";
import { LightViewStrategy } from "../../../../src/panels/light/strategies/light-view-strategy";
import type { HomeAssistant } from "../../../../src/types";
import {
  mockArea,
  mockEntity,
} from "../../../common/entity/context/context-mock";
import { createMockEntityState, createMockHass } from "../../../fixtures/hass";

const createLightHass = (): HomeAssistant => ({
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

const kitchenCards = async (
  config: Parameters<typeof LightViewStrategy.generate>[0]
): Promise<LovelaceCardConfig[]> => {
  const view = await LightViewStrategy.generate(config, createLightHass());
  const section = view.sections?.[0] as LovelaceSectionConfig;
  return section.cards!.slice(1);
};

describe("LightViewStrategy", () => {
  it("leaves hidden lights out of the tiles, toggle group and area buttons", async () => {
    const cards = await kitchenCards({
      type: "light",
      hidden_entities: ["light.status_led"],
    });

    const heading = cards.find((card) => card.type === "heading")!;
    expect(
      heading.badges.map((badge: LovelaceCardConfig) => badge.tap_action.target)
    ).toEqual([
      { entity_id: ["light.ceiling"] },
      { entity_id: ["light.ceiling"] },
    ]);
    expect(
      cards.find((card) => card.type === "toggle-group")?.entities
    ).toEqual(["light.ceiling"]);
    expect(
      cards.filter((card) => card.type === "tile").map((card) => card.entity)
    ).toEqual(["light.ceiling"]);
  });

  it("shows every light as a visibility wrapper while editing", async () => {
    const cards = await kitchenCards({
      type: "light",
      hidden_entities: ["light.status_led"],
      edit_visibility: true,
    });

    expect(cards[0]).toMatchObject({ type: "heading", heading: "Kitchen" });
    expect(cards[0].badges).toBeUndefined();
    expect(
      cards.slice(1).map(({ type, entity, hidden }) => ({
        type,
        entity,
        hidden,
      }))
    ).toEqual([
      { type: "entity-visibility", entity: "light.ceiling", hidden: false },
      { type: "entity-visibility", entity: "light.status_led", hidden: true },
    ]);
  });
});
