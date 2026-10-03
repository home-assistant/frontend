import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";

export const loadVacuumSegmentMappingView = () =>
  import("./ha-more-info-view-vacuum-segment-mapping");

export const showVacuumSegmentMappingView = (
  element: HTMLElement,
  localize: LocalizeFunc,
  entityId: string
): void => {
  fireEvent(element, "show-child-view", {
    viewTag: "ha-more-info-view-vacuum-segment-mapping",
    viewImport: loadVacuumSegmentMappingView,
    viewTitle: localize("ui.dialogs.vacuum_segment_mapping.title"),
    viewParams: { entityId },
  });
};
