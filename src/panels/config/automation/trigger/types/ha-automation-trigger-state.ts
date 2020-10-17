import "@polymer/paper-input/paper-input";
import { customElement, html, LitElement, property } from "lit-element";
import "../../../../../components/entity/ha-entity-attribute-picker";
import "../../../../../components/entity/ha-entity-picker";
import { ForDict, StateTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import {
  handleChangeEvent,
  TriggerElement,
} from "../ha-automation-trigger-row";

@customElement("ha-automation-trigger-state")
export class HaStateTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: StateTrigger;

  public static get defaultConfig() {
    return { entity_id: "" };
  }

  protected render() {
    const { entity_id, attribute, to, from } = this.trigger;
    let trgFor = this.trigger.for;

    if (
      trgFor &&
      ((trgFor as ForDict).hours ||
        (trgFor as ForDict).minutes ||
        (trgFor as ForDict).seconds)
    ) {
      // If the trigger was defined using the yaml dict syntax, convert it to
      // the equivalent string format
      let { hours = 0, minutes = 0, seconds = 0 } = trgFor as ForDict;
      hours = hours.toString();
      minutes = minutes.toString().padStart(2, "0");
      seconds = seconds.toString().padStart(2, "0");

      trgFor = `${hours}:${minutes}:${seconds}`;
    }

    return html`
      <ha-entity-picker
        .value=${entity_id}
        @value-changed=${this._valueChanged}
        .name=${"entity_id"}
        .hass=${this.hass}
        allow-custom-entity
      ></ha-entity-picker>
      <ha-entity-attribute-picker
        .hass=${this.hass}
        .entityId=${entity_id}
        .value=${attribute}
        .name=${"attribute"}
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.state.attribute"
        )}
        @value-changed=${this._valueChanged}
        allow-custom-value
      ></ha-entity-attribute-picker>
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.state.from"
        )}
        .name=${"from"}
        .value=${from}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <paper-input
        label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.state.to"
        )}
        .name=${"to"}
        .value=${to}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.state.for"
        )}
        .name=${"for"}
        .value=${trgFor}
        @value-changed=${this._valueChanged}
      ></paper-input>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-state": HaStateTrigger;
  }
}
