import "@polymer/paper-input/paper-input";
import { customElement, html, LitElement, property } from "lit-element";
import "../../../../../components/entity/ha-entity-picker";
import { TimeTrigger } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import {
  handleChangeEvent,
  TriggerElement,
} from "../ha-automation-trigger-row";

const includeDomains = ["input_datetime"];

@customElement("ha-automation-trigger-time")
export class HaTimeTrigger extends LitElement implements TriggerElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public trigger!: TimeTrigger;

  public static get defaultConfig() {
    return { at: "" };
  }

  protected render() {
    const { at } = this.trigger;
    return html`
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.time.at"
        )}
        name="at"
        .value=${at?.startsWith("input_datetime.") ? "" : at}
        @value-changed=${this._valueChanged}
      ></paper-input>
      or
      <ha-entity-picker
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.time.at_input_datetime"
        )}
        .includeDomains=${includeDomains}
        .name=${"at"}
        .value=${at?.startsWith("input_datetime.") ? at : ""}
        @value-changed=${this._valueChanged}
        .hass=${this.hass}
      ></ha-entity-picker>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    if (
      this.trigger.at &&
      (ev.target as HTMLElement).localName === "paper-input" &&
      this.trigger.at.startsWith("input_datetime.") &&
      !ev.detail.value
    ) {
      return;
    }
    if (
      this.trigger.at &&
      (ev.target as HTMLElement).localName === "ha-entity-picker" &&
      !this.trigger.at.startsWith("input_datetime.") &&
      !ev.detail.value
    ) {
      return;
    }
    handleChangeEvent(this, ev);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-time": HaTimeTrigger;
  }
}
