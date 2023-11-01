import { TodoItem, TodoItemStatus } from "../../../src/data/todo";
import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockTodo = (hass: MockHomeAssistant) => {
  hass.mockWS("todo/item/list", () => ({
    items: [
      {
        uid: "12",
        summary: "Milk",
        status: TodoItemStatus.NeedsAction,
      },
      {
        uid: "13",
        summary: "Eggs",
        status: TodoItemStatus.NeedsAction,
      },
      {
        uid: "14",
        summary: "Oranges",
        status: TodoItemStatus.Completed,
      },
    ] as TodoItem[],
  }));
};
