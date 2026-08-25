import { describe, expect, it, vi } from "vitest";
import type { LovelaceSectionConfig } from "../../../../../src/data/lovelace/config/section";
import type { LovelaceViewConfig } from "../../../../../src/data/lovelace/config/view";
import { checkConditionsMet } from "../../../../../src/panels/lovelace/common/validate-condition";
import type { ConditionalCardConfig } from "../../../../../src/panels/lovelace/cards/types";
import { HomeOverviewViewStrategy } from "../../../../../src/panels/lovelace/strategies/home/home-overview-view-strategy";
import type { HomeAssistant } from "../../../../../src/types";
import {
  createMockEntityState,
  createMockHass,
} from "../../../../fixtures/hass";

const createHass = (state: string): HomeAssistant => {
  const hass = createMockHass({
    "binary_sensor.front_door": createMockEntityState(
      "binary_sensor.front_door",
      state,
      { device_class: "door" }
    ),
  });
  return {
    ...hass,
    config: { ...hass.config, components: [] },
    panels: {},
  };
};

const sections = (view: LovelaceViewConfig): LovelaceSectionConfig[] => {
  expect(view.type).toBe("sections");
  return view.sections as LovelaceSectionConfig[];
};

describe("HomeOverviewViewStrategy security alerts", () => {
  it("maps configured severity to the security alert card config", async () => {
    const view = await HomeOverviewViewStrategy.generate(
      {
        type: "home-overview",
        alert_entities: [
          { entity: "binary_sensor.front_door", severity: "alert" },
        ],
      },
      createHass("on")
    );
    const alertSection = sections(view)[0];

    expect(alertSection.cards).toEqual([
      {
        type: "heading",
        heading: "ui.panel.lovelace.strategy.security.active_alerts",
        heading_style: "title",
        grid_options: { columns: "full" },
      },
      {
        type: "alert",
        entity: "binary_sensor.front_door",
        color: "red",
        visibility: [
          {
            condition: "state",
            entity: "binary_sensor.front_door",
            state: "on",
          },
        ],
      },
    ]);
  });

  it("reactively shows the area-less empty state only without active alerts", async () => {
    const inactiveHass = createHass("off");
    const view = await HomeOverviewViewStrategy.generate(
      {
        type: "home-overview",
        alert_entities: [{ entity: "binary_sensor.front_door" }],
        hide_suggested_entities: true,
      },
      inactiveHass
    );
    const emptyStateCard = sections(view)[1]
      ?.cards?.[0] as ConditionalCardConfig;

    expect(
      checkConditionsMet(emptyStateCard.conditions, inactiveHass, {})
    ).toBe(true);
    expect(
      checkConditionsMet(emptyStateCard.conditions, createHass("on"), {})
    ).toBe(false);
    expect(emptyStateCard.card.type).toBe("empty-state");
  });

  it("shows the area-less empty state when prediction returns no controls", async () => {
    const hass = createHass("off");
    hass.config = { ...hass.config, components: ["usage_prediction"] };
    hass.callWS = vi.fn().mockResolvedValue({ entities: [] });
    const view = await HomeOverviewViewStrategy.generate(
      {
        type: "home-overview",
        alert_entities: [{ entity: "binary_sensor.front_door" }],
      },
      hass
    );

    expect(
      sections(view).some((section) =>
        section.cards?.some((card) => card.type === "conditional")
      )
    ).toBe(true);
  });

  it("does not show the area-less empty state with a predicted control", async () => {
    const hass = createHass("off");
    hass.states["light.kitchen"] = createMockEntityState("light.kitchen", "on");
    hass.config = { ...hass.config, components: ["usage_prediction"] };
    hass.callWS = vi.fn().mockResolvedValue({ entities: ["light.kitchen"] });
    const view = await HomeOverviewViewStrategy.generate(
      {
        type: "home-overview",
        alert_entities: [{ entity: "binary_sensor.front_door" }],
      },
      hass
    );

    expect(
      sections(view).some((section) =>
        section.cards?.some((card) => card.type === "conditional")
      )
    ).toBe(false);
  });

  it("keeps the Home view when prediction loading fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const hass = createHass("off");
    hass.config = { ...hass.config, components: ["usage_prediction"] };
    hass.callWS = vi
      .fn()
      .mockRejectedValue(new Error("Prediction unavailable"));
    const view = await HomeOverviewViewStrategy.generate(
      {
        type: "home-overview",
        alert_entities: [{ entity: "binary_sensor.front_door" }],
      },
      hass
    );

    const alertCard = sections(view)[0]?.cards?.[1];
    expect(alertCard?.type).toBe("alert");
  });

  it("does not show the area-less empty state with configured favorites", async () => {
    const view = await HomeOverviewViewStrategy.generate(
      {
        type: "home-overview",
        alert_entities: [{ entity: "binary_sensor.front_door" }],
        favorite_entities: ["binary_sensor.front_door"],
      },
      createHass("off")
    );

    expect(
      sections(view).some((section) =>
        section.cards?.some((card) => card.type === "conditional")
      )
    ).toBe(false);
  });

  it("does not show the area-less empty state with a visible shortcut", async () => {
    const view = await HomeOverviewViewStrategy.generate(
      {
        type: "home-overview",
        alert_entities: [{ entity: "binary_sensor.front_door" }],
        hide_suggested_entities: true,
        shortcuts: [{ type: "custom", path: "/test", label: "Test" }],
      },
      createHass("off")
    );

    expect(
      sections(view).some((section) =>
        section.cards?.some((card) => card.type === "conditional")
      )
    ).toBe(false);
  });
});
