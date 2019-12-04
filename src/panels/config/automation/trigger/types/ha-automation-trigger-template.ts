import "../../../../../components/ha-textarea";
import { LitElement, property, html, customElement } from "lit-element";
import { HomeAssistant } from "../../../../../types";
import {
  TemplateTrigger,
  handleChangeEvent,
} from "../ha-automation-trigger-row";

@customElement("ha-automation-trigger-template")
export class HaTemplateTrigger extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public trigger!: TemplateTrigger;

  public static get defaultConfig() {
    return { value_template: "" };
  }

  protected render() {
    const { value_template } = this.trigger;
    return html`
      <ha-textarea
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.template.value_template"
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
