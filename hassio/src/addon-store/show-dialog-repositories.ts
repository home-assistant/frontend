import { fireEvent } from "../../../src/common/dom/fire_event";
import "./hassio-repository-editor";

export const showRepositoriesDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hassio-repository-editor",
    dialogImport: () =>
      import(
        /* webpackChunkName: "hassio-repository-editor" */ "./hassio-repository-editor"
      ),
    dialogParams: { repos: (element as any)._repos },
  });
};
