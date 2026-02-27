import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, queryAll } from "lit/decorators";
import type { HomeAssistant } from "../../types";
import "./ha-form";
import type { HaForm } from "./ha-form";
import type {
  HaFormDataContainer,
  HaFormElement,
  HaFormGridSchema,
  HaFormSchema,
} from "./types";

@customElement("ha-form-grid")
export class HaFormGrid extends LitElement implements HaFormElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data!: HaFormDataContainer;

  @property({ attribute: false }) public schema!: HaFormGridSchema;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public computeLabel?: (
    schema: HaFormSchema,
    data?: HaFormDataContainer
  ) => string;

  @property({ attribute: false }) public computeHelper?: (
    schema: HaFormSchema
  ) => string;

  @property({ attribute: false }) public localizeValue?: (
    key: string
  ) => string;

  @queryAll("ha-form", true) private _forms?: HaForm[];

  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  public async reportValidity(): Promise<boolean> {
    const forms = this._forms ?? [];
    let valid = true;
    for (const form of forms) {
      if (!form.reportValidity()) {
        valid = false;
      }
    }
    return valid;
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
            .localizeValue=${this.localizeValue}
          ></ha-form>
        `
      )}
    `;
  }

  static styles = css`
    :host {
      display: grid !important;
      grid-template-columns: repeat(
        var(--form-grid-column-count, auto-fit),
        minmax(var(--form-grid-min-width, 200px), 1fr)
      );
      grid-column-gap: var(--ha-space-2);
      grid-row-gap: var(--ha-space-6);
    }
    :host > ha-form {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-grid": HaFormGrid;
  }
}
