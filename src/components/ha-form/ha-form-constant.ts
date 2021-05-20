import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
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
