import "@polymer/paper-input/paper-input";
import { customElement, html, LitElement, property } from "lit-element";
import { TimeCondition } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import {
  ConditionElement,
  handleChangeEvent,
} from "../ha-automation-condition-row";

@customElement("ha-automation-condition-time")
export class HaTimeCondition extends LitElement implements ConditionElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

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
