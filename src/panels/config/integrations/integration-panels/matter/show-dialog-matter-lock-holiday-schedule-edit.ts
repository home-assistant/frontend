import { fireEvent } from "../../../../../common/dom/fire_event";
import type {
  MatterLockInfo,
  MatterHolidaySchedule,
} from "../../../../../data/matter-lock";

export interface MatterLockHolidayScheduleEditDialogParams {
  device_id: string;
  lockInfo: MatterLockInfo;
  schedule?: MatterHolidaySchedule;
  onSaved: () => void;
}

export const loadMatterLockHolidayScheduleEditDialog = () =>
  import("./dialog-matter-lock-holiday-schedule-edit");

export const showMatterLockHolidayScheduleEditDialog = (
  element: HTMLElement,
  dialogParams: MatterLockHolidayScheduleEditDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-matter-lock-holiday-schedule-edit",
    dialogImport: loadMatterLockHolidayScheduleEditDialog,
    dialogParams,
  });
};
