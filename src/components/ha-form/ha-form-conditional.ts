import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant } from "../../types";
import "./ha-form";
import type {
  HaFormDataContainer,
  HaFormElement,
  HaFormConditionalSchema,
  HaFormSchema,
} from "./types";

@customElement("ha-form-conditional")
export class HaFormConditional extends LitElement implements HaFormElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data!: HaFormDataContainer;

  @property({ attribute: false }) public schema!: HaFormConditionalSchema;

  @property({ type: Boolean }) public disabled = false;

  @property() public computeLabel?: (
    schema: HaFormSchema,
    data?: HaFormDataContainer
  ) => string;

  @property() public computeHelper?: (schema: HaFormSchema) => string;

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("schema") || changedProps.has("data")) {
      this.toggleAttribute("hidden", !this.schema.condition(this.data));
    }
  }

  protected render() {
    if (!this.schema.condition(this.data)) {
      return nothing;
    }
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this.data}
        .schema=${this.schema.schema}
        .disabled=${this.disabled}
        .computeLabel=${this.computeLabel}
        .computeHelper=${this.computeHelper}
      ></ha-form>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host([hidden]) {
        display: none !important;
      }
      :host ha-form {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-conditional": HaFormConditional;
  }
}
