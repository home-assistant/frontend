import { computeDomain } from "../../../common/entity/compute_domain";
import {
  getSupportedForecastTypes,
  type ModernForecastType,
} from "../../../data/weather";
import type { WeatherForecastCardConfig } from "../cards/types";
import type { CardSuggestion, CardSuggestionProvider } from "./types";

const VARIANTS: ModernForecastType[] = ["daily", "hourly"];

export const weatherForecastCardSuggestions: CardSuggestionProvider<WeatherForecastCardConfig> =
  {
    getEntitySuggestion(hass, entityId) {
      if (computeDomain(entityId) !== "weather") return null;
      const stateObj = hass.states[entityId];
      if (!stateObj) return null;
      const supported = new Set(getSupportedForecastTypes(stateObj));
      const suggestions: CardSuggestion<WeatherForecastCardConfig>[] = [];
      for (const forecastType of VARIANTS) {
        if (!supported.has(forecastType)) continue;
        suggestions.push({
          label: hass.localize(
            `ui.panel.lovelace.editor.card.weather-forecast.${forecastType}`
          ),
          config: {
            type: "weather-forecast",
            entity: entityId,
            forecast_type: forecastType,
          },
        });
      }
      return suggestions.length ? suggestions : null;
    },
  };
