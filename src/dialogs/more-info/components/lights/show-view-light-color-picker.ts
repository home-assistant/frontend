import { fireEvent } from "../../../../common/dom/fire_event";

export interface LightColorPickerViewParams {
  entityId: string;
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
