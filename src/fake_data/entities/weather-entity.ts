import { MockBaseEntity } from "./base-entity";
import type { EntityAttributes } from "./types";

const WEATHER_ATTRIBUTES = [
  "temperature",
  "apparent_temperature",
  "dew_point",
  "humidity",
  "pressure",
  "wind_speed",
  "wind_gust_speed",
  "wind_bearing",
  "visibility",
  "uv_index",
  "ozone",
  "cloud_coverage",
  "temperature_unit",
  "pressure_unit",
  "wind_speed_unit",
  "visibility_unit",
  "precipitation_unit",
  "attribution",
];

export class MockWeatherEntity extends MockBaseEntity {
  protected _getStateAttributes(): EntityAttributes {
    const attrs = this.attributes;
    const stateAttrs: EntityAttributes = {};
    for (const key of WEATHER_ATTRIBUTES) {
      if (key in attrs) {
        stateAttrs[key] = attrs[key];
      }
    }
    return stateAttrs;
  }
}
