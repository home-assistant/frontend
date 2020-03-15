import "@polymer/paper-input/paper-input";
import "../../../../../components/ha-yaml-editor";

import { LitElement, property, customElement } from "lit-element";
import {
  TriggerElement,
  handleChangeEvent,
} from "../ha-automation-trigger-row";
import { HomeAssistant } from "../../../../../types";
import { html } from "lit-html";
import { EventTrigger } from "../../../../../data/automation";

@customElement("ha-automation-trigger-event")
export class HaEventTrigger extends LitElement implements TriggerElement {
  @property() public hass!: HomeAssistant;
  @property() public trigger!: EventTrigger;

  public static get defaultConfig() {
    return { event_type: "", event_data: {} };
  }

  public render() {
    const { event_type, event_data } = this.trigger;
    return html`
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.event.event_type"
        )}
        name="event_type"
        .value="${event_type}"
        @value-changed="${this._valueChanged}"
      ></paper-input>
      <ha-yaml-editor
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.event.event_data"
        )}
        .name=${"event_data"}
        .defaultValue=${event_data}
        @value-changed=${this._dataChanged}
      ></ha-yaml-editor>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    handleChangeEvent(this, ev);
  }

  private _dataChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    handleChangeEvent(this, ev);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-event": HaEventTrigger;
  }
}
