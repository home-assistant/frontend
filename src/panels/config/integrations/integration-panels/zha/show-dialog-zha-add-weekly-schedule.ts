import { fireEvent } from "../../../../../common/dom/fire_event";
import type { ZHAWeeklyScheduleLink } from "../../../../../data/zha";

export interface ZHAAddWeeklyScheduleDialogParams {
  /** Supported thermostats that are not linked yet. */
  thermostats: string[];
  /** Existing link to edit; its thermostat cannot be changed. */
  link?: ZHAWeeklyScheduleLink;
}

export const loadZHAAddWeeklyScheduleDialog = () =>
  import("./dialog-zha-add-weekly-schedule");

export const showZHAAddWeeklyScheduleDialog = (
  element: HTMLElement,
  params: ZHAAddWeeklyScheduleDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-zha-add-weekly-schedule",
    dialogImport: loadZHAAddWeeklyScheduleDialog,
    dialogParams: params,
  });
};
