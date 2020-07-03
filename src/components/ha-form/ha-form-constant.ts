import "@polymer/paper-input/paper-input";
import {
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  CSSResult,
  css,
} from "lit-element";
import { HaFormElement, HaFormConstantSchema } from "./ha-form";

@customElement("ha-form-constant")
export class HaFormConstant extends LitElement implements HaFormElement {
  @property({ attribute: false }) public schema!: HaFormConstantSchema;

  @property() public label!: string;

  protected render(): TemplateResult {
    return html`<span class="label">${this.label}</span>: ${this.schema.value}`;
  }

  static get styles(): CSSResult {
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
