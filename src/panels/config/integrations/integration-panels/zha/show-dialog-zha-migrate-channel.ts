import { fireEvent } from "../../../../../common/dom/fire_event";

export interface ZHAMigrateChannelDialogParams {
  currentChannel: number;
}

export const loadZHAMigrateChannelDialog = () =>
  import("./dialog-zha-migrate-channel");

export const showZHAMigrateChannelDialog = (
  element: HTMLElement,
  zhaMigrateChannelParams: ZHAMigrateChannelDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zha-migrate-channel",
    dialogImport: loadZHAMigrateChannelDialog,
    dialogParams: zhaMigrateChannelParams,
  });
};
