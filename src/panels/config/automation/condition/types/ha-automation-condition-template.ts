import "@polymer/paper-input/paper-textarea";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { TemplateCondition } from "../../../../../data/automation";
import { HomeAssistant } from "../../../../../types";
import { handleChangeEvent } from "../ha-automation-condition-row";

@customElement("ha-automation-condition-template")
export class HaTemplateCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public condition!: TemplateCondition;

  public static get defaultConfig() {
    return { value_template: "" };
  }

  protected render() {
    const { value_template } = this.condition;
    return html`
      <paper-textarea
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.template.value_template"
        )}
        name="value_template"
        .value=${value_template}
        @value-changed=${this._valueChanged}
        dir="ltr"
      ></paper-textarea>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }
}
