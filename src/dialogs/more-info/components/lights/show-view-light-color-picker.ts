import { fireEvent } from "../../../../common/dom/fire_event";
import type { LightPickerMode } from "./light-color-picker";

export interface LightColorPickerViewParams {
  entityId: string;
  defaultMode: LightPickerMode;
}

export const loadLightColorPickerView = () =>
  import("./ha-more-info-view-light-color-picker");

export const showLightColorPickerView = (
  element: HTMLElement,
  title: string,
  params: LightColorPickerViewParams
): void => {
  fireEvent(element, "show-child-view", {
    viewTag: "ha-more-info-view-light-color-picker",
    viewImport: loadLightColorPickerView,
    viewTitle: title,
    viewParams: params,
  });
};
