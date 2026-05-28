import type { TemplateResult } from "lit";
import { html } from "lit";
import { customElement } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { live } from "lit/directives/live";
import { HaFormString } from "../components/ha-form/ha-form-string";
import "../components/ha-icon-button";
import "../components/input/ha-input";

/**
 * Auth-only specialisation of ha-form-string
 * in light DOM for password managers controlled
 * (light-dom-input property)
 */
@customElement("ha-auth-form-string")
export class HaAuthFormString extends HaFormString {
  protected createRenderRoot() {
    return this;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.style.position = "relative";
  }

  protected override render(): TemplateResult {
    const type = !this.isPassword ? this.stringType : "password";
    return html`
      <ha-input
        light-dom-input
        .passwordToggle=${this.isPassword}
        .type=${type}
        .label=${this.label}
        .value=${this.data || ""}
        .hint=${this.helper}
        .disabled=${this.disabled}
        .required=${!!this.schema.required}
        .autoValidate=${!!this.schema.required}
        .name=${this.schema.name}
        .autofocus=${!!this.schema.autofocus}
        .autocomplete=${this.schema.autocomplete}
        .validationMessage=${this.schema.required
          ? this.localize?.("ui.panel.page-authorize.form.error_required")
          : undefined}
        @input=${this._valueChanged}
        @change=${this._valueChanged}
      >
        <input
          slot="input"
          name=${this.schema.name}
          type=${type}
          autocomplete=${ifDefined(this.schema.autocomplete)}
          ?required=${!!this.schema.required}
          ?autofocus=${!!this.schema.autofocus}
          ?disabled=${this.disabled}
          .value=${live(this.data ?? "")}
        />
      </ha-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-auth-form-string": HaAuthFormString;
  }
}
