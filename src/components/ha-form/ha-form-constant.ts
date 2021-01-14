import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import { HaFormConstantSchema, HaFormElement } from "./ha-form";

@customElement("ha-form-constant")
export class HaFormConstant extends LitElement implements HaFormElement {
  @property({ attribute: false }) public schema!: HaFormConstantSchema;

  @property() public label!: string;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    fireEvent(this, "value-changed", {
      value: this.schema.value,
    });
  }

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
