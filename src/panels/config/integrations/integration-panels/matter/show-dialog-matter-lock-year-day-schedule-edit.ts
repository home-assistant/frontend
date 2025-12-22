import { fireEvent } from "../../../../../common/dom/fire_event";
import type {
  MatterLockInfo,
  MatterLockUser,
  MatterYearDaySchedule,
} from "../../../../../data/matter-lock";

export interface MatterLockYearDayScheduleEditDialogParams {
  device_id: string;
  lockInfo: MatterLockInfo;
  users: MatterLockUser[];
  schedule?: MatterYearDaySchedule;
  onSaved: () => void;
}

export const loadMatterLockYearDayScheduleEditDialog = () =>
  import("./dialog-matter-lock-year-day-schedule-edit");

export const showMatterLockYearDayScheduleEditDialog = (
  element: HTMLElement,
  dialogParams: MatterLockYearDayScheduleEditDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-matter-lock-year-day-schedule-edit",
    dialogImport: loadMatterLockYearDayScheduleEditDialog,
    dialogParams,
  });
};
