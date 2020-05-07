import { fireEvent } from "../../../../src/common/dom/fire_event";
import "./dialog-hassio-repositories";
import { HassioAddonRepository } from "../../../../src/data/hassio/addon";

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
    dialogImport: () =>
      import(
        /* webpackChunkName: "dialog-hassio-repositories" */ "./dialog-hassio-repositories"
      ),
    dialogParams,
  });
};
