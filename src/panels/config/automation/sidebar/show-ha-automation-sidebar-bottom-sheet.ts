import { fireEvent } from "../../../../common/dom/fire_event";
import "./ha-automation-sidebar-bottom-sheet";

export const showAutomationSidebarBottomSheet = (
  element: HTMLElement
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-automation-sidebar-bottom-sheet",
    dialogImport: () => import("./ha-automation-sidebar-bottom-sheet"),
    dialogParams: {},
  });
};
