import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { HaFormConstantSchema, HaFormElement } from "./types";

@customElement("ha-form-constant")
export class HaFormConstant extends LitElement implements HaFormElement {
  @property({ attribute: false }) public schema!: HaFormConstantSchema;

  @property() public label!: string;

  protected render(): TemplateResult {
    return html`<span class="label">${this.label}</span>${this.schema.value
        ? `: ${this.schema.value}`
        : ""}`;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }
      .label {
        font-weight: 500;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-constant": HaFormConstant;
  }
}
