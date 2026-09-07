import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { fireEvent } from "../../../../../common/dom/fire_event";
import type {
  InfraredCapturedCode,
  InfraredCommand,
} from "../../../../../data/infrared";

export interface InfraredRecordCommandDialogParams {
  /** The commands already known, to name the recorded one and spot repeats. */
  commands: InfraredCommand[];
  subscribeReceiver: (
    entityId: string,
    callback: (captured: InfraredCapturedCode) => void
  ) => Promise<UnsubscribeFunc>;
  createCommand: (values: { name: string; code: string }) => Promise<unknown>;
}

export const loadInfraredRecordCommandDialog = () =>
  import("./dialog-infrared-record-command");

export const showInfraredRecordCommandDialog = (
  element: HTMLElement,
  dialogParams: InfraredRecordCommandDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-infrared-record-command",
    dialogImport: loadInfraredRecordCommandDialog,
    dialogParams,
  });
};
