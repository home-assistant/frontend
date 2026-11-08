import { fireEvent } from "../../common/dom/fire_event";
import type { TodoItem } from "../../data/todo";

export interface TodoItemEditDialogParams {
  entity: string;
  item?: TodoItem | Omit<TodoItem, "uid">;
  /** Categories used by other items, suggested along the list's ones. */
  categories?: string[];
}

export const loadTodoItemEditDialog = () => import("./dialog-todo-item-editor");

export const showTodoItemEditDialog = (
  element: HTMLElement,
  detailParams: TodoItemEditDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-todo-item-editor",
    dialogImport: loadTodoItemEditDialog,
    dialogParams: detailParams,
  });
};
