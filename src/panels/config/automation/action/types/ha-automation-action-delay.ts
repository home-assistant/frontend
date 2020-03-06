import "@polymer/paper-input/paper-input";
import "../../../../../components/ha-service-picker";
import "../../../../../components/entity/ha-entity-picker";

import { LitElement, property, customElement, html } from "lit-element";
import { ActionElement, handleChangeEvent } from "../ha-automation-action-row";
import { HomeAssistant } from "../../../../../types";
import { DelayAction } from "../../../../../data/script";

@customElement("ha-automation-action-delay")
export class HaDelayAction extends LitElement implements ActionElement {
  @property() public hass!: HomeAssistant;
  @property() public action!: DelayAction;

  public static get defaultConfig() {
    return { delay: "" };
  }

  public render() {
    const { delay } = this.action;

    return html`
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.delay.delay"
        )}
        name="delay"
        .value=${delay}
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
    "ha-automation-action-delay": HaDelayAction;
  }
}
