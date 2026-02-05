import { fireEvent } from "../../../../common/dom/fire_event";
import type { AutomationConfig } from "../../../../data/automation";
import type { ScriptConfig } from "../../../../data/script";
import type { Blueprint } from "../../../../data/blueprint";

export const loadPasteReplaceDialog = () => import("./dialog-paste-replace");

interface BasePasteReplaceDialogParams<D, T> {
  domain: D;
  pastedConfig: T;
  onClose: () => void;
  onAppend: () => void;
  onReplace: () => void;
}

export type PasteReplaceDialogParams =
  | BasePasteReplaceDialogParams<"automation", AutomationConfig>
  | BasePasteReplaceDialogParams<"script", ScriptConfig>
  | BasePasteReplaceDialogParams<"blueprint", Blueprint>;

export const showPasteReplaceDialog = (
  element: HTMLElement,
  params: PasteReplaceDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-dialog-paste-replace",
    dialogImport: loadPasteReplaceDialog,
    dialogParams: params,
  });
};
