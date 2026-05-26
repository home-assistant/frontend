import { alarmPanelCardSuggestions } from "./hui-alarm-panel-card-suggestions";
import { calendarCardSuggestions } from "./hui-calendar-card-suggestions";
import { gaugeCardSuggestions } from "./hui-gauge-card-suggestions";
import { historyGraphCardSuggestions } from "./hui-history-graph-card-suggestions";
import { humidifierCardSuggestions } from "./hui-humidifier-card-suggestions";
import { mapCardSuggestions } from "./hui-map-card-suggestions";
import { mediaControlCardSuggestions } from "./hui-media-control-card-suggestions";
import { pictureEntityCardSuggestions } from "./hui-picture-entity-card-suggestions";
import { plantStatusCardSuggestions } from "./hui-plant-status-card-suggestions";
import { statisticsGraphCardSuggestions } from "./hui-statistics-graph-card-suggestions";
import { thermostatCardSuggestions } from "./hui-thermostat-card-suggestions";
import { tileCardSuggestions } from "./hui-tile-card-suggestions";
import { todoListCardSuggestions } from "./hui-todo-list-card-suggestions";
import { weatherForecastCardSuggestions } from "./hui-weather-forecast-card-suggestions";
import type { CardSuggestionProvider } from "./types";

export const CARD_SUGGESTION_PROVIDERS: Record<string, CardSuggestionProvider> =
  {
    tile: tileCardSuggestions,
    "alarm-panel": alarmPanelCardSuggestions,
    calendar: calendarCardSuggestions,
    gauge: gaugeCardSuggestions,
    humidifier: humidifierCardSuggestions,
    map: mapCardSuggestions,
    "media-control": mediaControlCardSuggestions,
    "picture-entity": pictureEntityCardSuggestions,
    "plant-status": plantStatusCardSuggestions,
    "statistics-graph": statisticsGraphCardSuggestions,
    "history-graph": historyGraphCardSuggestions,
    thermostat: thermostatCardSuggestions,
    "todo-list": todoListCardSuggestions,
    "weather-forecast": weatherForecastCardSuggestions,
  };
