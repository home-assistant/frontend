/* eslint-disable lit/prefer-static-styles */
import { html } from "lit";
import { customElement } from "lit/decorators";
import { HaForm } from "../components/ha-form/ha-form";
import "./ha-auth-form-string";

@customElement("ha-auth-form")
export class HaAuthForm extends HaForm {
  protected fieldElementName(type: string): string {
    if (type === "string") {
      return `ha-auth-form-${type}`;
    }
    return super.fieldElementName(type);
  }

  protected createRenderRoot() {
    // attach it as soon as possible to make sure we fetch all events.
    this.addValueChangedListener(this);
    return this;
  }

  protected render() {
    return html`
      <style>
        ha-auth-form .root > * {
          display: block;
        }
        ha-auth-form .root > *:not([own-margin]):not(:last-child) {
          margin-bottom: 24px;
        }
        ha-auth-form ha-alert[own-margin] {
          margin-bottom: 4px;
        }
      </style>
      ${super.render()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-auth-form": HaAuthForm;
  }
}
