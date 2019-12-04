import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
// tslint:disable-next-line
import { PaperRadioGroupElement } from "@polymer/paper-radio-group/paper-radio-group";
import "../../../../../components/entity/ha-entity-picker";

import { hasLocation } from "../../../../../common/entity/has_location";
import { computeStateDomain } from "../../../../../common/entity/compute_state_domain";
import { LitElement, property, html, customElement } from "lit-element";
import { HomeAssistant } from "../../../../../types";
import { ZoneTrigger } from "../ha-automation-trigger-row";
import { PolymerChangedEvent } from "../../../../../polymer-types";
import { fireEvent } from "../../../../../common/dom/fire_event";

function zoneAndLocationFilter(stateObj) {
  return hasLocation(stateObj) && computeStateDomain(stateObj) !== "zone";
}

@customElement("ha-automation-trigger-zone")
export class HaZoneTrigger extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public trigger!: ZoneTrigger;

  public static get defaultConfig() {
    return {
      entity_id: "",
      zone: "",
      event: "enter",
    };
  }

  protected render() {
    const { entity_id, zone, event } = this.trigger;
    return html`
      <ha-entity-picker
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.zone.entity"
        )}
        .value=${entity_id}
        @value-changed=${this._entityPicked}
        .hass=${this.hass}
        allow-custom-entity
        .entityFilter=${zoneAndLocationFilter}
      ></ha-entity-picker>
      <ha-entity-picker
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.zone.zone"
        )}
        .value=${zone}
        @value-changed=${this._zonePicked}
        .hass=${this.hass}
        allow-custom-entity
        .includeDomains=${["zone"]}
      ></ha-entity-picker>
      <label id="eventlabel">
        ${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.zone.event"
        )}
      </label>
      <paper-radio-group
        .selected=${event}
        aria-labelledby="eventlabel"
        @paper-radio-group-changed=${this._radioGroupPicked}
      >
        <paper-radio-button name="enter">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.zone.enter"
          )}
        </paper-radio-button>
        <paper-radio-button name="leave">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.zone.leave"
          )}
        </paper-radio-button>
      </paper-radio-group>
    `;
  }

  private _entityPicked(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.trigger, entity_id: ev.detail.value },
    });
  }

  private _zonePicked(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: { ...this.trigger, zone: ev.detail.value },
    });
  }

  private _radioGroupPicked(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        ...this.trigger,
        event: (ev.target as PaperRadioGroupElement).selected,
      },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-zone": HaZoneTrigger;
  }
}
