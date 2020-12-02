import { HassEntity } from "home-assistant-js-websocket";
import { fireEvent } from "../../common/dom/fire_event";

export interface SelectMediaPlayerDialogParams {
  mediaSources: HassEntity[];
  sourceSelectedCallback: (entityId: string) => void;
}

export const showSelectMediaPlayerDialog = (
  element: HTMLElement,
  selectMediaPlayereDialogParams: SelectMediaPlayerDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-select-media-player",
    dialogImport: () => import("./hui-dialog-select-media-player"),
    dialogParams: selectMediaPlayereDialogParams,
  });
};
