import type { TodoItem } from "../../../src/data/todo";
import { TodoItemStatus } from "../../../src/data/todo";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

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
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  hass.mockWS("todo/item/subscribe", (_msg, _hass) => () => {});
};
