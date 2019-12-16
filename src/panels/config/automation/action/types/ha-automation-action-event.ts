import "@polymer/paper-input/paper-input";
import "../../../../../components/ha-service-picker";
import "../../../../../components/entity/ha-entity-picker";
import "../../../../../components/ha-yaml-editor";

import { LitElement, property, customElement } from "lit-element";
import { ActionElement, handleChangeEvent } from "../ha-automation-action-row";
import { HomeAssistant } from "../../../../../types";
import { html } from "lit-html";
import { EventAction } from "../../../../../data/script";

@customElement("ha-automation-action-event")
export class HaEventAction extends LitElement implements ActionElement {
  @property() public hass!: HomeAssistant;
  @property() public action!: EventAction;

  public static get defaultConfig(): EventAction {
    return { event: "", event_data: {} };
  }

  public render() {
    const { event, event_data } = this.action;

    return html`
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.event.event"
        )}
        name="event"
        .value=${event}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <ha-yaml-editor
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.event.service_data"
        )}
        .name=${"event_data"}
        .value=${event_data}
        @value-changed=${this._valueChanged}
      ></ha-yaml-editor>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-action-event": HaEventAction;
  }
}
