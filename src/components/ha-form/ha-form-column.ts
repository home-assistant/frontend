import "./ha-form";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import type {
  HaFormColumnSchema,
  HaFormDataContainer,
  HaFormElement,
  HaFormSchema,
} from "./types";
import type { HomeAssistant } from "../../types";

@customElement("ha-form-column")
export class HaFormColumn extends LitElement implements HaFormElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data!: HaFormDataContainer;

  @property({ attribute: false }) public schema!: HaFormColumnSchema;

  @property({ type: Boolean }) public disabled = false;

  @property() public computeLabel?: (
    schema: HaFormSchema,
    data?: HaFormDataContainer
  ) => string;

  @property() public computeHelper?: (schema: HaFormSchema) => string;

  protected render(): TemplateResult {
    return html`
      ${this.schema.schema.map(
        (field) =>
          html`
            <ha-form
              .hass=${this.hass}
              .data=${this.data}
              .schema=${[field]}
              .disabled=${this.disabled}
              .computeLabel=${this.computeLabel}
              .computeHelper=${this.computeHelper}
              style="width: calc(${100 / (this.schema.columns || 2)}% - 4px)"
            ></ha-form>
          `
      )}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex !important;
        align-items: flex-start;
        justify-content: space-between;
        flex-wrap: wrap;
      }
      :host > ha-form {
        display: block;
        margin-bottom: 24px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-column": HaFormColumn;
  }
}
