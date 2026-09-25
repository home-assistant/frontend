import type { HassEntity } from "home-assistant-js-websocket";
import { fireEvent } from "../../../../common/dom/fire_event";

export const loadSirenAdvancedControlsView = () =>
  import("./ha-more-info-siren-advanced-controls");

export const showSirenAdvancedControlsView = (
  element: HTMLElement,
  stateObj: HassEntity
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-more-info-siren-advanced-controls",
    dialogImport: loadSirenAdvancedControlsView,
    dialogParams: {
      stateObj,
    },
  });
};
