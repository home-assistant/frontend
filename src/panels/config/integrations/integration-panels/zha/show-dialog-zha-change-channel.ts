import { fireEvent } from "../../../../../common/dom/fire_event";

export interface ZHAChangeChannelDialogParams {
  currentChannel: number;
}

export const loadZHAChangeChannelDialog = () =>
  import("./dialog-zha-change-channel");

export const showZHAChangeChannelDialog = (
  element: HTMLElement,
  zhaChangeChannelParams: ZHAChangeChannelDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zha-change-channel",
    dialogImport: loadZHAChangeChannelDialog,
    dialogParams: zhaChangeChannelParams,
  });
};
