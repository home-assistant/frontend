import { fireEvent } from "../../../../common/dom/fire_event";

export const loadVacuumSegmentMappingView = () =>
  import("./ha-more-info-view-vacuum-segment-mapping");

export const showVacuumSegmentMappingView = (
  element: HTMLElement,
  entityId: string
): void => {
  fireEvent(element, "show-child-view", {
    viewTag: "ha-more-info-view-vacuum-segment-mapping",
    viewImport: loadVacuumSegmentMappingView,
    viewTitle: "Map vacuum segments to areas",
    viewParams: { entityId },
  });
};
