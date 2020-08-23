import { HassEntity } from "home-assistant-js-websocket";
import { fireEvent } from "../../common/dom/fire_event";

export interface SelectMediaSourceDialogParams {
  mediaSources: HassEntity[];
  sourceSelectedCallback: (entityId: string) => void;
}

export const showSelectMediaSourceDialog = (
  element: HTMLElement,
  selectMediaSourceDialogParams: SelectMediaSourceDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-select-media-source",
    dialogImport: () =>
      import(
        /* webpackChunkName: "hui-dialog-select-media-source" */ "./hui-dialog-select-media-source"
      ),
    dialogParams: selectMediaSourceDialogParams,
  });
};
