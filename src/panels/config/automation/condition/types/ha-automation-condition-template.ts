import "../../../../../components/ha-textarea";
import { html, LitElement } from "lit";
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
      <p>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.conditions.type.template.value_template"
        )}
        *
      </p>
      <ha-code-editor
        name="value_template"
        mode="jinja2"
        .hass=${this.hass}
        .value=${value_template}
        autofocus
        autocomplete-entities
        @value-changed=${this._valueChanged}
        dir="ltr"
      ></ha-code-editor>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-condition-template": HaTemplateCondition;
  }
}
