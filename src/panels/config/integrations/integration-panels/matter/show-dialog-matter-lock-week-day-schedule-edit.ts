import { fireEvent } from "../../../../../common/dom/fire_event";
import type {
  MatterLockInfo,
  MatterLockUser,
  MatterWeekDaySchedule,
} from "../../../../../data/matter-lock";

export interface MatterLockWeekDayScheduleEditDialogParams {
  device_id: string;
  lockInfo: MatterLockInfo;
  users: MatterLockUser[];
  schedule?: MatterWeekDaySchedule;
  onSaved: () => void;
}

export const loadMatterLockWeekDayScheduleEditDialog = () =>
  import("./dialog-matter-lock-week-day-schedule-edit");

export const showMatterLockWeekDayScheduleEditDialog = (
  element: HTMLElement,
  dialogParams: MatterLockWeekDayScheduleEditDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-matter-lock-week-day-schedule-edit",
    dialogImport: loadMatterLockWeekDayScheduleEditDialog,
    dialogParams,
  });
};
