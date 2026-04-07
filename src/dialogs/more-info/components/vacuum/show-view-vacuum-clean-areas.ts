import { html } from "lit";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import type { HomeAssistant } from "../../../../types";
import "./ha-more-info-view-vacuum-clean-areas-header-action";

export const loadVacuumCleanAreasView = () =>
  import("./ha-more-info-view-vacuum-clean-areas");

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
    viewHeaderAction: (hass: HomeAssistant) => html`
      <ha-more-info-view-vacuum-clean-areas-header-action
        slot="headerActionItems"
        .hass=${hass}
        .entityId=${entityId}
      ></ha-more-info-view-vacuum-clean-areas-header-action>
    `,
  });
};
