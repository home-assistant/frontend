import "../../../../../components/ha-textarea";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { TemplateCondition } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import { handleChangeEvent } from "../ha-automation-condition-row";

@customElement("ha-automation-condition-template")
export class HaTemplateCondition extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public condition!: TemplateCondition;

  public static get defaultConfig() {
    return { value_template: "" };
  }

  protected render() {
    const { value_template } = this.condition;
    return html`
      <ha-textarea
        name="value_template"
        .label=${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.template.value_template"
        )}
        .value=${value_template}
        @input=${this._valueChanged}
        dir="ltr"
        autogrow
      ></ha-textarea>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }

  static styles = css`
    ha-textarea {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-template": HaTemplateCondition;
  }
}
