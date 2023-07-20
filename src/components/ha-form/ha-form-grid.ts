import "./ha-form";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import type {
  HaFormGridSchema,
  HaFormDataContainer,
  HaFormElement,
  HaFormSchema,
} from "./types";
import type { HomeAssistant } from "../../types";

@customElement("ha-form-grid")
export class HaFormGrid extends LitElement implements HaFormElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data!: HaFormDataContainer;

  @property({ attribute: false }) public schema!: HaFormGridSchema;

  @property({ type: Boolean }) public disabled = false;

  @property() public computeLabel?: (
    schema: HaFormSchema,
    data?: HaFormDataContainer
  ) => string;

  @property() public computeHelper?: (schema: HaFormSchema) => string;

  public async focus() {
    await this.updateComplete;
    this.renderRoot.querySelector("ha-form")?.focus();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has("schema")) {
      if (this.schema.column_min_width) {
        this.style.setProperty(
          "--form-grid-min-width",
          this.schema.column_min_width
        );
      } else {
        this.style.setProperty("--form-grid-min-width", "");
      }
    }
  }

  protected render(): TemplateResult {
    return html`
      ${this.schema.schema.map(
        (item) => html`
          <ha-form
            .hass=${this.hass}
            .data=${this.data}
            .schema=${[item]}
            .disabled=${this.disabled}
            .computeLabel=${this.computeLabel}
            .computeHelper=${this.computeHelper}
          ></ha-form>
        `
      )}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: grid !important;
        grid-template-columns: repeat(
          var(--form-grid-column-count, auto-fit),
          minmax(var(--form-grid-min-width, 200px), 1fr)
        );
        grid-column-gap: 8px;
        grid-row-gap: 24px;
      }
      :host > ha-form {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-grid": HaFormGrid;
  }
}
