import { fireEvent } from "../../../../common/dom/fire_event";

export interface VacuumSegmentMappingDialogParams {
  entityId: string;
}

export const loadVacuumSegmentMappingDialog = () =>
  import("./dialog-vacuum-segment-mapping");

export const showVacuumSegmentMappingDialog = (
  element: HTMLElement,
  params: VacuumSegmentMappingDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-vacuum-segment-mapping",
    dialogImport: loadVacuumSegmentMappingDialog,
    dialogParams: params,
  });
};
