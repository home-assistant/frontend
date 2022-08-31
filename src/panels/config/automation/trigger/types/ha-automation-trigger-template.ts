import "../../../../../components/ha-textarea";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { TemplateTrigger } from "../../../../../data/automation";
import type { HomeAssistant } from "../../../../../types";
import { handleChangeEvent } from "../ha-automation-trigger-row";

@customElement("ha-automation-trigger-template")
export class HaTemplateTrigger extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public trigger!: TemplateTrigger;

  public static get defaultConfig() {
    return { value_template: "" };
  }

  protected render() {
    const { value_template } = this.trigger;
    return html`
      <p>
        ${this.hass.localize(
          "ui.panel.config.automation.editor.triggers.type.template.value_template"
        )}
        *
      </p>
      <ha-code-editor
        .name=${"value_template"}
        mode="jinja2"
        .hass=${this.hass}
        .value=${value_template}
        autocomplete-entities
        @value-changed=${this._valueChanged}
        dir="ltr"
      ></ha-code-editor>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    handleChangeEvent(this, ev);
  }

  static get styles() {
    return css`
      p {
        margin-top: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-trigger-template": HaTemplateTrigger;
  }
}
