import type { TodoItem } from "../../../src/data/todo";
import { TodoItemStatus } from "../../../src/data/todo";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const items = {
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
    {
      uid: "15",
      summary: "Beer",
    },
  ] as TodoItem[],
};

export const mockTodo = (hass: MockHomeAssistant) => {
  hass.mockWS("todo/item/list", () => items);
  hass.mockWS("todo/item/move", () => undefined);
  hass.mockWS("todo/item/subscribe", (_msg, _hass, onChange) => {
    onChange!(items);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {};
  });
};
