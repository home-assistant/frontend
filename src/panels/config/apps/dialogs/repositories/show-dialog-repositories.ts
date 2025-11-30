import { fireEvent } from "../../../../../common/dom/fire_event";
import type { HassioAddonsInfo } from "../../../../../data/hassio/addon";
import "./dialog-repositories";

export interface RepositoryDialogParams {
  addon: HassioAddonsInfo;
  url?: string;
  closeCallback?: () => void;
}

export const showRepositoriesDialog = (
  element: HTMLElement,
  dialogParams: RepositoryDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-apps-repositories",
    dialogImport: () => import("./dialog-repositories"),
    dialogParams,
  });
};
