import type {
  ForecastAttribute,
  ModernForecastType,
} from "../../../src/data/weather";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const HOUR = 3600000;

const CONDITIONS = [
  "partlycloudy",
  "rainy",
  "cloudy",
  "sunny",
  "pouring",
  "partlycloudy",
  "sunny",
];

// Daily changes around the current temperature, so the forecast looks real.
const TEMPERATURE_CHANGES = [0, -1.5, -3, -1, 1.5, 2.5, 1];

const PRECIPITATION = new Map([
  ["rainy", 2.4],
  ["pouring", 9.1],
]);

const forecastEntry = (
  datetime: Date,
  temperature: number,
  condition: string
): ForecastAttribute => ({
  datetime: datetime.toISOString(),
  condition,
  temperature: Math.round(temperature * 10) / 10,
  precipitation: PRECIPITATION.get(condition) ?? 0,
  precipitation_probability: PRECIPITATION.has(condition) ? 80 : 10,
});

const generateForecast = (
  forecastType: ModernForecastType,
  temperature: number,
  condition: string
): ForecastAttribute[] => {
  const conditions = [condition, ...CONDITIONS.slice(1)];
  const now = new Date();

  if (forecastType === "hourly") {
    now.setMinutes(0, 0, 0);

    return Array.from({ length: 24 }, (_, hour) => {
      const datetime = new Date(now.getTime() + (hour + 1) * HOUR);

      // Warmest mid-afternoon and coldest before dawn
      const change =
        3 * Math.sin(((datetime.getHours() - 9) / 24) * 2 * Math.PI) -
        3 * Math.sin(((now.getHours() - 9) / 24) * 2 * Math.PI);

      return forecastEntry(
        datetime,
        temperature + change,
        conditions[Math.floor(hour / 6)]
      );
    });
  }

  now.setHours(12, 0, 0, 0);

  if (forecastType === "twice_daily") {
    return conditions.flatMap((dayCondition, day) => {
      const datetime = new Date(now.getTime() + day * 24 * HOUR);
      const dayTemperature = temperature + TEMPERATURE_CHANGES[day];

      return [
        {
          ...forecastEntry(datetime, dayTemperature, dayCondition),
          is_daytime: true,
        },
        {
          ...forecastEntry(
            new Date(datetime.getTime() + 12 * HOUR),
            dayTemperature - 6,
            dayCondition
          ),
          is_daytime: false,
        },
      ];
    });
  }

  return conditions.map((dayCondition, day) => {
    const dayTemperature = temperature + TEMPERATURE_CHANGES[day];

    return {
      ...forecastEntry(
        new Date(now.getTime() + day * 24 * HOUR),
        dayTemperature,
        dayCondition
      ),
      templow: Math.round((dayTemperature - 6) * 10) / 10,
    };
  });
};

/**
 * Answers forecast subscriptions of weather entities. An entity with a
 * `forecast` attribute gets that forecast. Other entities get a forecast made
 * up from their condition and temperature.
 */
export const mockWeather = (hass: MockHomeAssistant) => {
  hass.mockWS(
    "weather/subscribe_forecast",
    (
      msg: { entity_id: string; forecast_type: ModernForecastType },
      currentHass,
      onChange
    ) => {
      const stateObj = currentHass.states[msg.entity_id];
      onChange?.({
        type: msg.forecast_type,
        forecast: stateObj
          ? (stateObj.attributes.forecast ??
            generateForecast(
              msg.forecast_type,
              Number(stateObj.attributes.temperature ?? 15),
              stateObj.state
            ))
          : null,
      });

      return () => undefined;
    }
  );
};
