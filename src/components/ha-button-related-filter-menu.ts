import type { Corner } from "@material/mwc-menu";
import "@material/mwc-menu/mwc-menu-surface";
import { mdiFilterVariant } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { computeStateName } from "../common/entity/compute_state_name";
import { computeDeviceName } from "../data/device_registry";
import { findRelated, RelatedResult } from "../data/search";
import type { HomeAssistant } from "../types";
import "./device/ha-device-picker";
import "./entity/ha-entity-picker";
import "./ha-area-picker";
import "./ha-icon-button";

declare global {
  // for fire event
  interface HASSDomEvents {
    "related-changed": {
      value?: FilterValue;
      items?: RelatedResult;
      filter?: string;
    };
  }
}

interface FilterValue {
  area?: string;
  device?: string;
  entity?: string;
}

@customElement("ha-button-related-filter-menu")
export class HaRelatedFilterButtonMenu extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public corner: Corner = "BOTTOM_START";

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public value?: FilterValue;

  /**
   * Show no entities of these domains.
   * @type {Array}
   * @attr exclude-domains
   */
  @property({ type: Array, attribute: "exclude-domains" })
  public excludeDomains?: string[];

  @state() private _open = false;

  protected render(): TemplateResult {
    return html`
      <ha-icon-button
        @click=${this._handleClick}
        .label=${this.hass.localize("ui.components.related-filter-menu.filter")}
        .path=${mdiFilterVariant}
      ></ha-icon-button>
      <mwc-menu-surface
        .open=${this._open}
        .anchor=${this}
        .fullwidth=${this.narrow}
        .corner=${this.corner}
        @closed=${this._onClosed}
        @input=${stopPropagation}
      >
        <ha-area-picker
          .label=${this.hass.localize(
            "ui.components.related-filter-menu.filter_by_area"
          )}
          .hass=${this.hass}
          .value=${this.value?.area}
          no-add
          @value-changed=${this._areaPicked}
          @click=${this._preventDefault}
        ></ha-area-picker>
        <ha-device-picker
          .label=${this.hass.localize(
            "ui.components.related-filter-menu.filter_by_device"
          )}
          .hass=${this.hass}
          .value=${this.value?.device}
          @value-changed=${this._devicePicked}
          @click=${this._preventDefault}
        ></ha-device-picker>
        <ha-entity-picker
          .label=${this.hass.localize(
            "ui.components.related-filter-menu.filter_by_entity"
          )}
          .hass=${this.hass}
          .value=${this.value?.entity}
          .excludeDomains=${this.excludeDomains}
          @value-changed=${this._entityPicked}
          @click=${this._preventDefault}
        ></ha-entity-picker>
      </mwc-menu-surface>
    `;
  }

  private _handleClick(): void {
    if (this.disabled) {
      return;
    }
    this._open = true;
  }

  private _onClosed(ev): void {
    ev.stopPropagation();
    this._open = false;
  }

  private _preventDefault(ev) {
    ev.preventDefault();
  }

  private async _entityPicked(ev: CustomEvent) {
    ev.stopPropagation();
    const entityId = ev.detail.value;
    if (!entityId) {
      fireEvent(this, "related-changed", { value: undefined });
      return;
    }
    const filter = this.hass.localize(
      "ui.components.related-filter-menu.filtered_by_entity",
      "entity_name",
      computeStateName((ev.currentTarget as any).comboBox.selectedItem)
    );
    const items = await findRelated(this.hass, "entity", entityId);
    fireEvent(this, "related-changed", {
      value: { entity: entityId },
      filter,
      items,
    });
  }

  private async _devicePicked(ev: CustomEvent) {
    ev.stopPropagation();
    const deviceId = ev.detail.value;
    if (!deviceId) {
      fireEvent(this, "related-changed", { value: undefined });
      return;
    }
    const filter = this.hass.localize(
      "ui.components.related-filter-menu.filtered_by_device",
      "device_name",
      computeDeviceName(
        (ev.currentTarget as any).comboBox.selectedItem,
        this.hass
      )
    );
    const items = await findRelated(this.hass, "device", deviceId);

    fireEvent(this, "related-changed", {
      value: { device: deviceId },
      filter,
      items,
    });
  }

  private async _areaPicked(ev: CustomEvent) {
    ev.stopPropagation();
    const areaId = ev.detail.value;
    if (!areaId) {
      fireEvent(this, "related-changed", { value: undefined });
      return;
    }
    const filter = this.hass.localize(
      "ui.components.related-filter-menu.filtered_by_area",
      "area_name",
      (ev.currentTarget as any).comboBox.selectedItem.name
    );
    const items = await findRelated(this.hass, "area", areaId);
    fireEvent(this, "related-changed", {
      value: { area: areaId },
      filter,
      items,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: inline-block;
        position: relative;
        --mdc-menu-min-width: 250px;
      }
      ha-area-picker,
      ha-device-picker,
      ha-entity-picker {
        display: block;
        width: 300px;
        padding: 4px 16px;
        box-sizing: border-box;
      }
      ha-area-picker {
        padding-top: 16px;
      }
      ha-entity-picker {
        padding-bottom: 16px;
      }
      :host([narrow]) ha-area-picker,
      :host([narrow]) ha-device-picker,
      :host([narrow]) ha-entity-picker {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-button-related-filter-menu": HaRelatedFilterButtonMenu;
  }
}
