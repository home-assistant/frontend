import { computeDomain } from "../../../common/entity/compute_domain";
import type { TodoListCardConfig } from "../cards/types";
import type { CardSuggestionProvider } from "./types";

export const todoListCardSuggestions: CardSuggestionProvider<TodoListCardConfig> =
  {
    getEntitySuggestion(_hass, entityId) {
      if (computeDomain(entityId) !== "todo") return null;
      return {
        id: "todo-list",
        label: "To-do list",
        config: { type: "todo-list", entity: entityId },
      };
    },
  };
