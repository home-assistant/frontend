/* eslint-disable lit/prefer-static-styles */
import { TemplateResult, html } from "lit";
import { customElement } from "lit/decorators";
import { HaFormString } from "../components/ha-form/ha-form-string";
import "../components/ha-icon-button";
import "./ha-auth-textfield";

@customElement("ha-auth-form-string")
export class HaAuthFormString extends HaFormString {
  protected createRenderRoot() {
    return this;
  }

  protected render(): TemplateResult {
    return html`
      <style>
        ha-auth-form-string {
          display: block;
          position: relative;
        }
        ha-auth-form-string[own-margin] {
          margin-bottom: 5px;
        }
        ha-auth-form-string ha-auth-textfield {
          display: block !important;
        }
        ha-auth-form-string ha-icon-button {
          position: absolute;
          top: 8px;
          right: 8px;
          inset-inline-start: initial;
          inset-inline-end: 8px;
          --mdc-icon-button-size: 40px;
          --mdc-icon-size: 20px;
          color: var(--secondary-text-color);
          direction: var(--direction);
        }
      </style>
      <ha-auth-textfield
      .type=${
        !this.isPassword
          ? this.stringType
          : this.unmaskedPassword
          ? "text"
          : "password"
      }
        .label=${this.label}
        .value=${this.data || ""}
        .helper=${this.helper}
        helperPersistent
        .disabled=${this.disabled}
        .required=${this.schema.required}
        .autoValidate=${this.schema.required}
        .name=${this.schema.name}
        .autocomplete=${this.schema.autocomplete}
        .suffix=${
          this.isPassword
            ? // reserve some space for the icon.
              html`<div style="width: 24px"></div>`
            : this.schema.description?.suffix
        }
        .validationMessage=${this.schema.required ? "Required" : undefined}
        @input=${this._valueChanged}
        @change=${this._valueChanged}
        ></ha-auth-textfield>
        ${this.renderIcon()}
      </ha-auth-textfield>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-auth-form-string": HaAuthFormString;
  }
}
