import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";

export const loadVacuumCleanRoomsView = () =>
  import("./ha-more-info-view-vacuum-clean-rooms");

export const showVacuumCleanRoomsView = (
  element: HTMLElement,
  localize: LocalizeFunc,
  entityId: string
): void => {
  fireEvent(element, "show-child-view", {
    viewTag: "ha-more-info-view-vacuum-clean-rooms",
    viewImport: loadVacuumCleanRoomsView,
    viewTitle: localize("ui.dialogs.more_info_control.vacuum.clean_rooms"),
    viewParams: { entityId },
  });
};
