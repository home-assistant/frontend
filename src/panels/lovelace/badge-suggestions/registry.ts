import { entityBadgeSuggestions } from "./hui-entity-badge-suggestions";
import type { BadgeSuggestionProvider } from "./types";

export const BADGE_SUGGESTION_PROVIDERS: Record<
  string,
  BadgeSuggestionProvider
> = {
  entity: entityBadgeSuggestions,
};
