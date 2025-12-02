import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { HaFormConstantSchema, HaFormElement } from "./types";

@customElement("ha-form-constant")
export class HaFormConstant extends LitElement implements HaFormElement {
  @property({ attribute: false }) public schema!: HaFormConstantSchema;

  @property() public label!: string;

  protected render(): TemplateResult {
    return html`<span class="label">${this.label}</span>${this.schema.value
        ? `: ${this.schema.value}`
        : ""}`;
  }

  static styles = css`
    :host {
      display: block;
    }
    .label {
      font-weight: var(--ha-font-weight-medium);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-constant": HaFormConstant;
  }
}
