import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";

export interface EntityStateIconsValue {
  stateIcons: Record<string, string> | null;
  rangeIcons: Record<string, string> | null;
  defaultIcon: string;
}

export interface EntityStateIconsViewParams {
  entityId: string;
  stateIcons: Record<string, string> | null;
  rangeIcons: Record<string, string> | null;
  defaultIcon: string;
  placeholderIcon?: string;
  onChange: (value: EntityStateIconsValue) => void;
}

export const loadEntityStateIconsView = () =>
  import("./ha-more-info-view-entity-state-icons");

export const showEntityStateIconsView = (
  element: HTMLElement,
  localize: LocalizeFunc,
  params: EntityStateIconsViewParams
): void => {
  fireEvent(element, "show-child-view", {
    viewTag: "ha-more-info-view-entity-state-icons",
    viewImport: loadEntityStateIconsView,
    viewTitle: localize("ui.dialogs.entity_state_icons.title"),
    viewParams: params,
  });
};
