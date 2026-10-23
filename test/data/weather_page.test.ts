import type { HassEntity } from "home-assistant-js-websocket";
import { describe, expect, it } from "vitest";
import {
  findAirQualityEntities,
  findPollenEntities,
  findRainGauge,
  getBeaufort,
  getPm25Level,
  getRainGauge,
  getUvLevel,
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

describe("rain gauge", () => {
  const hass = createHass([
    entity("sensor.rain_rate", {
      device_class: "precipitation",
      state_class: "measurement",
    }),
    entity("sensor.rain_total", {
      device_class: "precipitation",
      state_class: "total_increasing",
    }),
  ]);

  it("only uses sensors that add up rain", () => {
    expect(findRainGauge(hass)).toBe("sensor.rain_total");
  });

  it("can be turned off", () => {
    expect(getRainGauge(hass, { rain_gauge_entity: null })).toBeUndefined();
  });
});

describe("air quality and pollen", () => {
  const categories = {
    airly: ["weather_alerts.air_quality_pollen"],
    accuweather: [
      "weather_alerts.forecasts",
      "weather_alerts.air_quality_pollen",
    ],
    xiaomi_miio: ["climate.air_purifiers"],
  };
  const hass = createHass(
    [
      entity("sensor.outside_pm25", { device_class: "pm25" }),
      entity("sensor.outside_aqi", { device_class: "aqi" }),
      entity("sensor.purifier_pm25", { device_class: "pm25" }),
      entity("sensor.home_grass_pollen"),
      entity("sensor.home_cloud_ceiling"),
    ],
    {
      "sensor.outside_pm25": { platform: "airly" },
      "sensor.outside_aqi": { platform: "airly" },
      "sensor.purifier_pm25": { platform: "xiaomi_miio" },
      "sensor.home_grass_pollen": {
        platform: "accuweather",
        translation_key: "grass_pollen",
      },
      "sensor.home_cloud_ceiling": {
        platform: "accuweather",
        translation_key: "cloud_ceiling",
      },
    }
  );

  it("finds outdoor air quality from air quality services", () => {
    expect(findAirQualityEntities(hass, categories)).toEqual([
      "sensor.outside_aqi",
      "sensor.outside_pm25",
    ]);
  });

  it("finds pollen sensors", () => {
    expect(findPollenEntities(hass, categories)).toEqual([
      "sensor.home_grass_pollen",
    ]);
  });
});

describe("levels", () => {
  it("uses the WHO UV index levels", () => {
    expect(getUvLevel(2)).toBe("low");
    expect(getUvLevel(4)).toBe("moderate");
    expect(getUvLevel(7)).toBe("high");
    expect(getUvLevel(9)).toBe("very_high");
    expect(getUvLevel(11)).toBe("extreme");
  });

  it("uses the WHO guideline for fine particles", () => {
    expect(getPm25Level(8)).toBe("good");
    expect(getPm25Level(20)).toBe("fair");
    expect(getPm25Level(100)).toBe("extremely_poor");
  });

  it("converts wind speed to Beaufort", () => {
    expect(getBeaufort(14, "km/h")).toBe(3);
    expect(getBeaufort(75, "km/h")).toBe(9);
    expect(getBeaufort(5, "Beaufort")).toBe(5);
    expect(getBeaufort(10, "unknown")).toBeUndefined();
  });
});
