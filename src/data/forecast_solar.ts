import { HomeAssistant } from "../types";

export interface ForecastSolarForecast {
  wh_hours: Record<string, number>;
}

export const getForecastSolarForecasts = (hass: HomeAssistant) =>
  hass.callWS<Record<string, ForecastSolarForecast>>({
    type: "forecast_solar/forecasts",
  });
