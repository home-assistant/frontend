import "@polymer/paper-input/paper-input";

import { LitElement, property, customElement } from "lit-element";
import { ActionElement, handleChangeEvent } from "../ha-automation-action-row";
import { HomeAssistant } from "../../../../../types";
import { html } from "lit-html";
import { WaitAction } from "../../../../../data/script";

@customElement("ha-automation-action-wait_template")
export class HaWaitAction extends LitElement implements ActionElement {
  @property() public hass!: HomeAssistant;
  @property() public action!: WaitAction;

  public static get defaultConfig() {
    return { wait_template: "", timeout: "" };
  }

  protected render() {
    const { wait_template, timeout } = this.action;

    return html`
      <ha-textarea
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.wait_template.wait_template"
        )}
        name="wait_template"
        .value=${wait_template}
        @value-changed=${this._valueChanged}
        dir="ltr"
      ></ha-textarea>
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.actions.type.wait_template.timeout"
        )}
        .name=${"timeout"}
        .value=${timeout}
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
    "ha-automation-action-wait_template": HaWaitAction;
  }
}
