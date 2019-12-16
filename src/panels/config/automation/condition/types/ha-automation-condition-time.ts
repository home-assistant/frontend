import "@polymer/paper-input/paper-input";
import { LitElement, html, property, customElement } from "lit-element";
import { HomeAssistant } from "../../../../../types";
import {
  handleChangeEvent,
  ConditionElement,
} from "../ha-automation-condition-row";
import { TimeCondition } from "../../../../../data/automation";

@customElement("ha-automation-condition-time")
export class HaTimeCondition extends LitElement implements ConditionElement {
  @property() public hass!: HomeAssistant;
  @property() public condition!: TimeCondition;

  public static get defaultConfig() {
    return {};
  }

  protected render() {
    const { after, before } = this.condition;
    return html`
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.time.after"
        )}
        name="after"
        .value=${after}
        @value-changed=${this._valueChanged}
      ></paper-input>
      <paper-input
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.time.before"
        )}
        name="before"
        .value=${before}
        @value-changed=${this._valueChanged}
      ></paper-input>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }
}
