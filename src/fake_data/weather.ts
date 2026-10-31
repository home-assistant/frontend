import type { ForecastAttribute } from "../data/weather";
import type { MockHomeAssistant } from "./provide_hass";

const HOUR_MS = 3600000;

const HOURLY_CONDITIONS = [
  "pouring",
  "rainy",
  "rainy",
  "partlycloudy",
  "cloudy",
  "cloudy",
  "partlycloudy",
];

export const hourlyForecast = (): ForecastAttribute[] => {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  return Array.from({ length: 24 }, (_, index) => {
    const datetime = new Date(start.getTime() + index * HOUR_MS);
    const hour = datetime.getHours();
    return {
      datetime: datetime.toISOString(),
      condition: HOURLY_CONDITIONS[index % HOURLY_CONDITIONS.length],
      temperature: Math.round(
        13 + 4 * Math.sin(((hour - 9) / 24) * 2 * Math.PI)
      ),
      precipitation_probability: Math.max(0, 80 - index * 10),
      precipitation: index < 4 ? 1.2 - index * 0.3 : 0,
      wind_speed: 14 + (index % 5) * 2,
      uv_index: Math.max(
        0,
        Math.round(5 * Math.sin(((hour - 7) / 12) * Math.PI))
      ),
      is_daytime: hour >= 8 && hour < 19,
    };
  });
};

const DAILY = [
  ["pouring", 17, 10, 80],
  ["partlycloudy", 19, 11, 30],
  ["sunny", 22, 13, 5],
  ["sunny", 24, 14, 0],
  ["partlycloudy", 21, 15, 20],
  ["rainy", 18, 12, 60],
  ["partlycloudy", 20, 12, 30],
  ["rainy", 19, 11, 55],
  ["pouring", 17, 9, 75],
  ["rainy", 18, 10, 45],
] as const;

export const dailyForecast = (): ForecastAttribute[] => {
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  return DAILY.map(([condition, temperature, templow, probability], index) => ({
    datetime: new Date(start.getTime() + index * 24 * HOUR_MS).toISOString(),
    condition,
    temperature,
    templow,
    precipitation_probability: probability,
  }));
};

// Earlier states of the weather entity, for the pressure trend and the
// comparison with the average high.
export const weatherHistory = (entityId: string) => {
  const now = Date.now();
  const states: { s: string; a: Record<string, number>; lu: number }[] = [];
  for (let hoursAgo = 7 * 24; hoursAgo > 0; hoursAgo -= 3) {
    const time = now - hoursAgo * HOUR_MS;
    const hour = new Date(time).getHours();
    states.push({
      s: "cloudy",
      a: {
        temperature: Math.round(
          11 + 4 * Math.sin(((hour - 9) / 24) * 2 * Math.PI)
        ),
        pressure: 1008 + hoursAgo / 3,
      },
      lu: time / 1000,
    });
  }
  return { [entityId]: states };
};

/** Forecasts for weather entities. */
export const mockWeatherForecasts = (hass: MockHomeAssistant) => {
  hass.mockWS("weather/subscribe_forecast", (msg, currentHass, onChange) => {
    let forecast: ForecastAttribute[];
    if (msg.forecast_type === "hourly") {
      // Start the hourly forecast at the current temperature
      forecast = hourlyForecast();
      const current = currentHass.states[msg.entity_id]?.attributes.temperature;
      const offset =
        typeof current === "number"
          ? Math.round(current) - forecast[0].temperature
          : 0;
      forecast = forecast.map((entry) => ({
        ...entry,
        temperature: entry.temperature + offset,
      }));
    } else {
      forecast = dailyForecast();
    }
    onChange!({ type: msg.forecast_type, forecast });
    return () => undefined;
  });
};

/** History and rain gauge statistics for the weather page cards. */
export const mockWeatherHistory = (hass: MockHomeAssistant) => {
  hass.mockWS("recorder/statistic_during_period", () => ({ change: 4.2 }));
  hass.mockWS("history/history_during_period", (msg) =>
    weatherHistory(msg.entity_ids?.[0] ?? "weather.home")
  );
};
