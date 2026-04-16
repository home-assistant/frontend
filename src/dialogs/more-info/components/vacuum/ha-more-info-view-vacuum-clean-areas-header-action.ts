import { mdiCogOutline } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-icon-button";
import { getExtendedEntityRegistryEntry } from "../../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../../types";
import { showVacuumSegmentMappingView } from "./show-view-vacuum-segment-mapping";

@customElement("ha-more-info-view-vacuum-clean-areas-header-action")
export class HaMoreInfoViewVacuumCleanAreasHeaderAction extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public params!: { entityId: string };

  @state() private _hasMapping = false;

  protected firstUpdated() {
    this._loadMapping();
  }

  private async _loadMapping() {
    if (!this.params.entityId || !this.hass.user?.is_admin) return;
    try {
      const entry = await getExtendedEntityRegistryEntry(
        this.hass,
        this.params.entityId
      );
      const areaMapping = entry?.options?.vacuum?.area_mapping;
      this._hasMapping =
        !!areaMapping &&
        Object.keys(areaMapping).some((areaId) => this.hass.areas[areaId]);
    } catch (_err) {
      // Keep _hasMapping as false
    }
  }

  protected render() {
    if (!this.hass.user?.is_admin || !this._hasMapping) {
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
    showVacuumSegmentMappingView(
      this,
      this.hass.localize,
      this.params.entityId
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-view-vacuum-clean-areas-header-action": HaMoreInfoViewVacuumCleanAreasHeaderAction;
  }
}
