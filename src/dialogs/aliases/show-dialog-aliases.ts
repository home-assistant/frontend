import { fireEvent } from "../../common/dom/fire_event";

export interface AliasesDialogParams {
  name: string;
  aliases: string[];
  updateEntry: (aliases: string[]) => Promise<unknown>;
}

export const loadAliasesDialog = () => import("./dialog-aliases");

export const showAliasesDialog = (
  element: HTMLElement,
  aliasesParams: AliasesDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-aliases",
    dialogImport: loadAliasesDialog,
    dialogParams: aliasesParams,
  });
};
