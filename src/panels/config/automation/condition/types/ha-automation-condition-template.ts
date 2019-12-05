import "../../../../../components/ha-textarea";
import { LitElement, property, html, customElement } from "lit-element";
import { HomeAssistant } from "../../../../../types";
import {
  TemplateCondition,
  handleChangeEvent,
} from "../ha-automation-condition-row";

@customElement("ha-automation-condition-template")
export class HaTemplateCondition extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public condition!: TemplateCondition;

  public static get defaultConfig() {
    return { value_template: "" };
  }

  protected render() {
    const { value_template } = this.condition;
    return html`
      <ha-textarea
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.template.value_template"
        )}
        name="value_template"
        .value=${value_template}
        @value-changed=${this._valueChanged}
        dir="ltr"
      ></ha-textarea>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }
}
