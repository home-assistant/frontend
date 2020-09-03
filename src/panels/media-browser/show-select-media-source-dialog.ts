import { HassEntity } from "home-assistant-js-websocket";
import { fireEvent } from "../../common/dom/fire_event";

export interface SelectMediaPlayereDialogParams {
  mediaSources: HassEntity[];
  sourceSelectedCallback: (entityId: string) => void;
}

export const showSelectMediaSourceDialog = (
  element: HTMLElement,
  selectMediaPlayereDialogParams: SelectMediaPlayereDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-select-media-player",
    dialogImport: () =>
      import(
        /* webpackChunkName: "hui-dialog-select-media-player" */ "./hui-dialog-select-media-player"
      ),
    dialogParams: selectMediaPlayereDialogParams,
  });
};
