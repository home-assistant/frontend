import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
// tslint:disable-next-line
import { PaperRadioGroupElement } from "@polymer/paper-radio-group/paper-radio-group";
import "../../../../../components/entity/ha-entity-picker";
import { LitElement, customElement, property, html } from "lit-element";
import { HomeAssistant } from "../../../../../types";
import {
  GeoLocationTrigger,
  handleChangeEvent,
} from "../ha-automation-trigger-row";
import { fireEvent } from "../../../../../common/dom/fire_event";

@customElement("ha-automation-trigger-geo_location")
export default class HaGeolocationTrigger extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public trigger!: GeoLocationTrigger;

  public static get defaultConfig() {
    return {
      source: "",
      zone: "",
      event: "enter",
    };
  }

  protected render() {
    const { source, zone, event } = this.trigger;

    return html`
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.geo_location.source"
        )}
        name="source"
        .value=${source}
        @value-changed="${this._valueChanged}"
      ></paper-input>
      <ha-entity-picker
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.geo_location.zone"
        )}
        .value=${zone}
        @value-changed=${this._zonePicked}
        .hass=${this.hass}
        allow-custom-entity
        .includeDomains=${["zone"]}
      ></ha-entity-picker>
      <label id="eventlabel">
        ${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.geo_location.event"
        )}
      </label>
      <paper-radio-group
        .selected=${event}
        aria-labelledby="eventlabel"
        @paper-radio-group-changed=${this._radioGroupPicked}
      >
        <paper-radio-button name="enter">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.geo_location.enter"
          )}
        </paper-radio-button>
        <paper-radio-button name="leave">
          ${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.geo_location.leave"
          )}
        </paper-radio-button>
      </paper-radio-group>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }

  private _zonePicked(ev: CustomEvent) {
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
    "ha-automation-trigger-geo_location": HaGeolocationTrigger;
  }
}
