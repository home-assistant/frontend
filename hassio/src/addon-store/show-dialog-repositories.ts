import { fireEvent } from "../../../src/common/dom/fire_event";
import "./hassio-repository-editor";
import { HassioAddonRepository } from "../../../src/data/hassio/addon";

export interface HassioRepositoryDialogParams {
  repos: HassioAddonRepository[];
  loadData: () => void;
}

export const showRepositoriesDialog = (
  element: HTMLElement,
  dialogParams: HassioRepositoryDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hassio-repository-editor",
    dialogImport: () =>
      import(
        /* webpackChunkName: "hassio-repository-editor" */ "./hassio-repository-editor"
      ),
    dialogParams,
  });
};
