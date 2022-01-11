import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/entity/ha-entity-picker";
import type { HaRadio } from "../../../../../components/ha-radio";
import type { GeoLocationTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import { handleChangeEvent } from "../ha-automation-trigger-row";

const includeDomains = ["zone"];

@customElement("ha-automation-trigger-geo_location")
export class HaGeolocationTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: GeoLocationTrigger;

  public static get defaultConfig() {
    return {
      source: "",
      zone: "",
      event: "enter" as GeoLocationTrigger["event"],
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
        @value-changed=${this._valueChanged}
      ></paper-input>
      <ha-entity-picker
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.geo_location.zone"
        )}
        .value=${zone}
        @value-changed=${this._zonePicked}
        .hass=${this.hass}
        allow-custom-entity
        .includeDomains=${includeDomains}
      ></ha-entity-picker>
      <label>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.geo_location.event"
        )}
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.geo_location.enter"
          )}
        >
          <ha-radio
            name="event"
            value="enter"
            .checked=${event === "enter"}
            @change=${this._radioGroupPicked}
          ></ha-radio>
        </ha-formfield>
        <ha-formfield
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.triggers.type.geo_location.leave"
          )}
        >
          <ha-radio
            name="event"
            value="leave"
            .checked=${event === "leave"}
            @change=${this._radioGroupPicked}
          ></ha-radio>
        </ha-formfield>
      </label>
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
        event: (ev.target as HaRadio).value,
      },
    });
  }

  static styles = css`
    label {
      display: flex;
      align-items: center;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-geo_location": HaGeolocationTrigger;
  }
}
