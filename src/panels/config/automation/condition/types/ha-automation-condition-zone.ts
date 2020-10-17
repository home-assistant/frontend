import "@polymer/paper-radio-button/paper-radio-button";
import { customElement, html, LitElement, property } from "lit-element";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeStateDomain } from "../../../../../common/entity/compute_state_domain";
import { hasLocation } from "../../../../../common/entity/has_location";
import "../../../../../components/entity/ha-entity-picker";
import { ZoneCondition } from "../../../../../data/automation";
import { PolymerChangedEvent } from "../../../../../polymer-types";
import { HomeAssistant } from "../../../../../types";

function zoneAndLocationFilter(stateObj) {
  return hasLocation(stateObj) && computeStateDomain(stateObj) !== "zone";
}

const includeDomains = ["zone"];

@customElement("ha-automation-condition-zone")
export class HaZoneCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public condition!: ZoneCondition;

  public static get defaultConfig() {
    return {
      entity_id: "",
      zone: "",
    };
  }

  protected render() {
    const { entity_id, zone } = this.condition;
    return html`
      <ha-entity-picker
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.zone.entity"
        )}
        .value=${entity_id}
        @value-changed=${this._entityPicked}
        .hass=${this.hass}
        allow-custom-entity
        .entityFilter=${zoneAndLocationFilter}
      ></ha-entity-picker>
      <ha-entity-picker
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.zone.zone"
        )}
        .value=${zone}
        @value-changed=${this._zonePicked}
        .hass=${this.hass}
        allow-custom-entity
        .includeDomains=${includeDomains}
      ></ha-entity-picker>
      <label id="eventlabel">
        ${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.zone.event"
        )}
      </label>
    `;
  }

  private _entityPicked(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.condition, entity_id: ev.detail.value },
    });
  }

  private _zonePicked(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.condition, zone: ev.detail.value },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-zone": HaZoneCondition;
  }
}
