import { format, startOfToday, startOfTomorrow } from "date-fns";
import { ForecastSolarForecast } from "../../../src/data/forecast_solar";
import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockForecastSolar = (hass: MockHomeAssistant) => {
  const todayString = format(startOfToday(), "yyyy-MM-dd");
  const tomorrowString = format(startOfTomorrow(), "yyyy-MM-dd");
  hass.mockWS(
    "forecast_solar/forecasts",
    (): Record<string, ForecastSolarForecast> => ({
      solar_forecast: {
        wh_hours: {
          [`${todayString}T06:00:00`]: 0,
          [`${todayString}T06:23:00`]: 6,
          [`${todayString}T06:45:00`]: 39,
          [`${todayString}T07:00:00`]: 28,
          [`${todayString}T08:00:00`]: 208,
          [`${todayString}T09:00:00`]: 352,
          [`${todayString}T10:00:00`]: 544,
          [`${todayString}T11:00:00`]: 748,
          [`${todayString}T12:00:00`]: 1259,
          [`${todayString}T13:00:00`]: 1361,
          [`${todayString}T14:00:00`]: 1373,
          [`${todayString}T15:00:00`]: 1370,
          [`${todayString}T16:00:00`]: 1186,
          [`${todayString}T17:00:00`]: 937,
          [`${todayString}T18:00:00`]: 652,
          [`${todayString}T19:00:00`]: 370,
          [`${todayString}T20:00:00`]: 155,
          [`${todayString}T21:48:00`]: 24,
          [`${todayString}T22:36:00`]: 0,
          [`${tomorrowString}T06:01:00`]: 0,
          [`${tomorrowString}T06:23:00`]: 9,
          [`${tomorrowString}T06:45:00`]: 47,
          [`${tomorrowString}T07:00:00`]: 48,
          [`${tomorrowString}T08:00:00`]: 473,
          [`${tomorrowString}T09:00:00`]: 827,
          [`${tomorrowString}T10:00:00`]: 1153,
          [`${tomorrowString}T11:00:00`]: 1413,
          [`${tomorrowString}T12:00:00`]: 1590,
          [`${tomorrowString}T13:00:00`]: 1652,
          [`${tomorrowString}T14:00:00`]: 1612,
          [`${tomorrowString}T15:00:00`]: 1438,
          [`${tomorrowString}T16:00:00`]: 1149,
          [`${tomorrowString}T17:00:00`]: 830,
          [`${tomorrowString}T18:00:00`]: 542,
          [`${tomorrowString}T19:00:00`]: 311,
          [`${tomorrowString}T20:00:00`]: 140,
          [`${tomorrowString}T21:47:00`]: 22,
          [`${tomorrowString}T22:34:00`]: 0,
        },
      },
    })
  );
};
