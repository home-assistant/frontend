import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";

export const loadVacuumCleanAreasView = () =>
  import("./ha-more-info-view-vacuum-clean-areas");

export const loadVacuumCleanAreasHeaderAction = () =>
  import("./ha-more-info-view-vacuum-clean-areas-header-action");

export const showVacuumCleanAreasView = (
  element: HTMLElement,
  localize: LocalizeFunc,
  entityId: string
): void => {
  fireEvent(element, "show-child-view", {
    viewTag: "ha-more-info-view-vacuum-clean-areas",
    viewImport: loadVacuumCleanAreasView,
    viewTitle: localize("ui.dialogs.more_info_control.vacuum.clean_areas"),
    viewParams: { entityId },
    viewHeaderTag: "ha-more-info-view-vacuum-clean-areas-header-action",
    viewHeaderImport: loadVacuumCleanAreasHeaderAction,
  });
};
