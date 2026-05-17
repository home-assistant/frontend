import { calendarCardSuggestions } from "./hui-calendar-card-suggestions";
import { tileCardSuggestions } from "./hui-tile-card-suggestions";
import { todoListCardSuggestions } from "./hui-todo-list-card-suggestions";
import type { CardSuggestionProvider } from "./types";

export const CARD_SUGGESTION_PROVIDERS: Record<string, CardSuggestionProvider> =
  {
    tile: tileCardSuggestions,
    calendar: calendarCardSuggestions,
    "todo-list": todoListCardSuggestions,
  };
