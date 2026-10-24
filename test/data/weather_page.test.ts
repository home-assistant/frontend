import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import {
  getWeatherSources,
  getWeatherValue,
} from "../../src/data/weather_page";
import type { HomeAssistant } from "../../src/types";

const entity = (
  entityId: string,
  attributes: Record<string, any> = {},
  state = "1"
): HassEntity => ({
  entity_id: entityId,
  state,
  attributes,
  last_changed: "",
  last_updated: "",
  context: { id: "", parent_id: null, user_id: null },
});

const createHass = (
  states: HassEntity[],
  entities: Record<string, Record<string, any>> = {}
) =>
  ({
    states: Object.fromEntries(states.map((s) => [s.entity_id, s])),
    entities: Object.fromEntries(
      Object.entries(entities).map(([entityId, entry]) => [
        entityId,
        { entity_id: entityId, labels: [], ...entry },
      ])
    ),
  }) as unknown as Pick<HomeAssistant, "states" | "entities">;

describe("getWeatherSources", () => {
  const hass = createHass([
    entity("weather.met", { temperature: 15 }),
    entity("weather.buienradar", { temperature: 16, uv_index: 4 }),
    entity("weather.thermostat"),
    entity("sensor.temperature"),
  ]);

  it("uses every weather entity without settings", () => {
    expect(getWeatherSources(hass)).toEqual([
      "weather.buienradar",
      "weather.met",
      "weather.thermostat",
    ]);
  });

  it("follows the preferred order and adds the rest", () => {
    expect(
      getWeatherSources(hass, { weather_entities: ["weather.met"] })
    ).toEqual(["weather.met", "weather.buienradar", "weather.thermostat"]);
  });

  it("leaves out excluded sources", () => {
    expect(
      getWeatherSources(hass, {
        weather_entities: ["weather.met"],
        excluded_weather_entities: ["weather.thermostat"],
      })
    ).toEqual(["weather.met", "weather.buienradar"]);
  });

  it("takes each value from the first source that has it", () => {
    const sources = ["weather.met", "weather.buienradar"];
    expect(getWeatherValue(hass, sources, "temperature")?.value).toBe(15);
    expect(getWeatherValue(hass, sources, "uv_index")?.stateObj.entity_id).toBe(
      "weather.buienradar"
    );
  });

  it("skips sources that are unavailable", () => {
    const unavailable = createHass([
      entity("weather.met", { temperature: 15 }, "unavailable"),
      entity("weather.buienradar", { temperature: 16 }),
    ]);
    expect(
      getWeatherValue(
        unavailable,
        ["weather.met", "weather.buienradar"],
        "temperature"
      )?.value
    ).toBe(16);
  });
});
