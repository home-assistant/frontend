import { mdiCogOutline } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../../components/ha-icon-button";
import type { HomeAssistant } from "../../../../types";
import { showVacuumSegmentMappingView } from "./show-view-vacuum-segment-mapping";

@customElement("ha-more-info-view-vacuum-clean-areas-header-action")
export class HaMoreInfoViewVacuumCleanAreasHeaderAction extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  protected render() {
    if (!this.hass.user?.is_admin) {
      return nothing;
    }
    return html`
      <ha-icon-button
        .label=${this.hass.localize(
          "ui.dialogs.more_info_control.vacuum.configure_area_mapping"
        )}
        .path=${mdiCogOutline}
        @click=${this._handleClick}
      ></ha-icon-button>
    `;
  }

  private _handleClick() {
    showVacuumSegmentMappingView(this, this.hass.localize, this.entityId);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-view-vacuum-clean-areas-header-action": HaMoreInfoViewVacuumCleanAreasHeaderAction;
  }
}
