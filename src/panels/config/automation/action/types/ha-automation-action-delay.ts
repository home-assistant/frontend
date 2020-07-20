import "@polymer/paper-input/paper-input";
import { customElement, html, LitElement, property } from "lit-element";
import "../../../../../components/entity/ha-entity-picker";
import "../../../../../components/ha-service-picker";
import { DelayAction } from "../../../../../data/script";
import { HomeAssistant } from "../../../../../types";
import { ActionElement, handleChangeEvent } from "../ha-automation-action-row";

@customElement("ha-automation-action-delay")
export class HaDelayAction extends LitElement implements ActionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

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
