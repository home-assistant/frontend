import { fireEvent } from "../../../common/dom/fire_event";
import type { ACTION_GROUPS } from "../../../data/action";
import type { ActionType } from "../../../data/script";

export const PASTE_VALUE = "__paste__";

// These will be replaced with the correct action
export const VIRTUAL_ACTIONS: Record<
  keyof (typeof ACTION_GROUPS)["building_blocks"]["members"],
  ActionType
> = {
  repeat_count: {
    repeat: {
      count: 2,
      sequence: [],
    },
  },
  repeat_while: {
    repeat: {
      while: "",
      sequence: [],
    },
  },
  repeat_until: {
    repeat: {
      until: "",
      sequence: [],
    },
  },
  repeat_for_each: {
    repeat: {
      for_each: "",
      sequence: [],
    },
  },
} as const;

export interface AddAutomationElementDialogParams {
  type: "trigger" | "condition" | "action";
  add: (key: string) => void;
  clipboardItem: string | undefined;
  group?: string;
}
const loadDialog = () => import("./add-automation-element-dialog");

export const showAddAutomationElementDialog = (
  element: HTMLElement,
  dialogParams: AddAutomationElementDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "add-automation-element-dialog",
    dialogImport: loadDialog,
    dialogParams,
  });
};
