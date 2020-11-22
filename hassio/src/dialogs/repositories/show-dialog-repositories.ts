import { fireEvent } from "../../../../src/common/dom/fire_event";
import { HassioAddonRepository } from "../../../../src/data/hassio/addon";
import "./dialog-hassio-repositories";

export interface HassioRepositoryDialogParams {
  repos: HassioAddonRepository[];
  loadData: () => Promise<void>;
}

export const showRepositoriesDialog = (
  element: HTMLElement,
  dialogParams: HassioRepositoryDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-hassio-repositories",
    dialogImport: () => import("./dialog-hassio-repositories"),
    dialogParams,
  });
};
