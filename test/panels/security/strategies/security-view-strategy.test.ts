import { describe, expect, it } from "vitest";
import type { LovelaceCardConfig } from "../../../../src/data/lovelace/config/card";
import type { LovelaceSectionRawConfig } from "../../../../src/data/lovelace/config/section";
import { isStrategySection } from "../../../../src/data/lovelace/config/section";
import {
  isSecurityPanelEntity,
  SecurityViewStrategy,
} from "../../../../src/panels/security/strategies/security-view-strategy";
import { createMockEntityState, createMockHass } from "../../../fixtures/hass";

const createSecurityHass = () => {
  const hass = createMockHass();
  hass.config = { ...hass.config, components: [] };
  for (const [entityId, deviceClass] of [
    ["binary_sensor.front_door", "door"],
    ["binary_sensor.window", "window"],
  ]) {
    hass.states[entityId] = createMockEntityState(entityId, "off", {
      device_class: deviceClass,
    });
  }
  hass.states["sensor.temperature"] = createMockEntityState(
    "sensor.temperature",
    "21"
  );
  return hass;
};

const cardsOf = (section?: LovelaceSectionRawConfig): LovelaceCardConfig[] =>
  !section || isStrategySection(section)
    ? []
    : (section.cards ?? []).filter((card) => card.type !== "heading");

const sectionWithHeading = (
  sections: LovelaceSectionRawConfig[] | undefined,
  heading: string
) =>
  sections?.find(
    (section) =>
      !isStrategySection(section) &&
      section.cards?.some(
        (card) => card.type === "heading" && card.heading === heading
      )
  );

const FAVORITES = "ui.panel.lovelace.strategy.security.favorites";
const ACTIVE_ALERTS = "ui.panel.lovelace.strategy.security.active_alerts";

describe("security-view-strategy", () => {
  it("includes glass break binary sensors", () => {
    const hass = createMockHass();
    const stateObj = createMockEntityState("binary_sensor.glass_break", "off", {
      device_class: "glass_break",
    });
    hass.states[stateObj.entity_id] = stateObj;

    expect(isSecurityPanelEntity(hass, stateObj)).toBe(true);
  });

  it("renders active alerts as individual cards in a visible section", async () => {
    const hass = createMockHass();
    hass.config = { ...hass.config, components: [] };

    const view = await SecurityViewStrategy.generate(
      {
        type: "security",
        alert_entities: [{ entity: "binary_sensor.window" }],
      },
      hass
    );

    const alertSection = view.sidebar?.sections?.[0];

    expect(alertSection?.visibility).toEqual([
      {
        condition: "or",
        conditions: [
          {
            condition: "and",
            conditions: [
              {
                condition: "state",
                entity: "binary_sensor.window",
                state: "on",
              },
            ],
          },
        ],
      },
    ]);
    expect(alertSection?.cards).toEqual([
      {
        type: "heading",
        heading: "ui.panel.lovelace.strategy.security.active_alerts",
        heading_style: "title",
      },
      {
        type: "alert",
        entity: "binary_sensor.window",
        alert_color: "amber",
        visibility: [
          {
            condition: "state",
            entity: "binary_sensor.window",
            state: "on",
          },
        ],
        grid_options: { columns: 12 },
      },
    ]);
  });

  it("drops hidden entities from the tiles but keeps their favorite and alert entries", async () => {
    const view = await SecurityViewStrategy.generate(
      {
        type: "security",
        hidden_entities: ["binary_sensor.front_door"],
        favorite_entities: ["binary_sensor.front_door"],
        alert_entities: [{ entity: "binary_sensor.front_door" }],
      },
      createSecurityHass()
    );

    const favorites = sectionWithHeading(view.sections, FAVORITES);
    const tiles = view.sections!.filter((section) => section !== favorites);

    expect(tiles.flatMap(cardsOf).map((card) => card.entity)).toEqual([
      "binary_sensor.window",
    ]);
    expect(cardsOf(favorites).map((card) => card.entity)).toEqual([
      "binary_sensor.front_door",
    ]);
    expect(
      cardsOf(sectionWithHeading(view.sidebar?.sections, ACTIVE_ALERTS)).map(
        (card) => card.entity
      )
    ).toEqual(["binary_sensor.front_door"]);
  });

  it("lists deleted and non-matching favorites only in edit mode", async () => {
    const config = {
      type: "security" as const,
      favorite_entities: [
        "binary_sensor.front_door",
        "binary_sensor.gone",
        "sensor.temperature",
      ],
    };

    const view = await SecurityViewStrategy.generate(
      config,
      createSecurityHass()
    );
    expect(
      cardsOf(sectionWithHeading(view.sections, FAVORITES)).map(
        (card) => card.entity
      )
    ).toEqual(["binary_sensor.front_door"]);

    const editView = await SecurityViewStrategy.generate(
      { ...config, edit_visibility: true },
      createSecurityHass()
    );
    expect(cardsOf(sectionWithHeading(editView.sections, FAVORITES))).toEqual([
      {
        type: "entity-visibility",
        entity: "binary_sensor.front_door",
        neighbor_entity: "binary_sensor.gone",
        fallback_entity: "binary_sensor.front_door",
        favorite: true,
        alert: "none",
        card: expect.objectContaining({ entity: "binary_sensor.front_door" }),
      },
      {
        type: "entity-visibility",
        entity: "binary_sensor.gone",
        neighbor_entity: "sensor.temperature",
        fallback_entity: "binary_sensor.front_door",
        favorite: true,
        alert: "none",
        card: expect.objectContaining({ entity: "binary_sensor.gone" }),
      },
      {
        type: "entity-visibility",
        entity: "sensor.temperature",
        neighbor_entity: "binary_sensor.gone",
        fallback_entity: "binary_sensor.front_door",
        favorite: true,
        alert: undefined,
        card: expect.objectContaining({ entity: "sensor.temperature" }),
      },
    ]);
  });

  it("keeps hidden tiles and lists every configured alert in edit mode", async () => {
    const view = await SecurityViewStrategy.generate(
      {
        type: "security",
        edit_visibility: true,
        hidden_entities: ["binary_sensor.front_door"],
        alert_entities: [
          { entity: "binary_sensor.front_door", severity: "alert" },
          { entity: "binary_sensor.gone" },
        ],
      },
      createSecurityHass()
    );

    expect(view.sections!.flatMap(cardsOf)).toEqual([
      {
        type: "entity-visibility",
        entity: "binary_sensor.front_door",
        hidden: true,
        favorite: false,
        alert: "alert",
        card: expect.objectContaining({ entity: "binary_sensor.front_door" }),
      },
      {
        type: "entity-visibility",
        entity: "binary_sensor.window",
        hidden: false,
        favorite: false,
        alert: "none",
        card: expect.objectContaining({ entity: "binary_sensor.window" }),
      },
    ]);

    const alerts = sectionWithHeading(view.sidebar?.sections, ACTIVE_ALERTS);
    expect(alerts?.visibility).toBeUndefined();
    expect(cardsOf(alerts)).toEqual([
      {
        type: "entity-visibility",
        entity: "binary_sensor.front_door",
        favorite: false,
        alert: "alert",
        alert_select: true,
        neighbor_entity: "binary_sensor.gone",
        fallback_entity: "binary_sensor.front_door",
        grid_options: { columns: 12 },
        card: {
          type: "alert",
          entity: "binary_sensor.front_door",
          alert_color: "red",
          clear_color: "red",
        },
      },
      {
        type: "entity-visibility",
        entity: "binary_sensor.gone",
        favorite: false,
        alert: "warning",
        alert_select: true,
        neighbor_entity: "binary_sensor.front_door",
        fallback_entity: undefined,
        grid_options: { columns: 12 },
        card: {
          type: "alert",
          entity: "binary_sensor.gone",
          alert_color: "amber",
          clear_color: "amber",
        },
      },
    ]);
  });
});
