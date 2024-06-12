import { fireEvent } from "../../../../common/dom/fire_event";

export interface ScheduleBlockInfo {
  from: string;
  to: string;
}

export interface ScheduleBlockInfoDialogParams {
  block: ScheduleBlockInfo;
  updateBlock?: (update: ScheduleBlockInfo) => void;
  deleteBlock?: () => void;
}

export const loadScheduleBlockInfoDialog = () =>
  import("./dialog-schedule-block-info");

export const showScheduleBlockInfoDialog = (
  element: HTMLElement,
  params: ScheduleBlockInfoDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-schedule-block-info",
    dialogImport: loadScheduleBlockInfoDialog,
    dialogParams: params,
  });
};
