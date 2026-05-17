import { computeDomain } from "../../../common/entity/compute_domain";
import type { TodoListCardConfig } from "../cards/types";
import type { CardSuggestionProvider } from "./types";

export const todoListCardSuggestions: CardSuggestionProvider<TodoListCardConfig> =
  {
    getEntitySuggestion(hass, entityId) {
      if (computeDomain(entityId) !== "todo") return null;
      return {
        id: "todo-list",
        label: hass.localize(
          "ui.panel.lovelace.editor.cardpicker.suggestions.todo_list"
        ),
        config: { type: "todo-list", entity: entityId },
      };
    },
  };
