import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import type { HomeAssistant } from "../../types";
import "./ha-form";
import "../ha-expansion-panel";
import type {
  HaFormDataContainer,
  HaFormElement,
  HaFormExpandableSchema,
  HaFormSchema,
} from "./types";

@customElement("ha-form-expandable")
export class HaFormExpendable extends LitElement implements HaFormElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data!: HaFormDataContainer;

  @property({ attribute: false }) public schema!: HaFormExpandableSchema;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public computeLabel?: (
    schema: HaFormSchema,
    data?: HaFormDataContainer,
    options?: { path?: string[] }
  ) => string;

  @property({ attribute: false }) public computeHelper?: (
    schema: HaFormSchema,
    options?: { path?: string[] }
  ) => string;

  @property({ attribute: false }) public localizeValue?: (
    key: string
  ) => string;

  private _renderDescription() {
    const description = this.computeHelper?.(this.schema);
    return description ? html`<p>${description}</p>` : nothing;
  }

  private _computeLabel = (
    schema: HaFormSchema,
    data?: HaFormDataContainer,
    options?: { path?: string[] }
  ) => {
    if (!this.computeLabel) return this.computeLabel;

    return this.computeLabel(schema, data, {
      ...options,
      path: [...(options?.path || []), this.schema.name],
    });
  };

  private _computeHelper = (
    schema: HaFormSchema,
    options?: { path?: string[] }
  ) => {
    if (!this.computeHelper) return this.computeHelper;

    return this.computeHelper(schema, {
      ...options,
      path: [...(options?.path || []), this.schema.name],
    });
  };

  protected render() {
    return html`
      <ha-expansion-panel outlined .expanded=${Boolean(this.schema.expanded)}>
        ${this.schema.icon
          ? html`
              <ha-icon slot="leading-icon" .icon=${this.schema.icon}></ha-icon>
            `
          : this.schema.iconPath
            ? html`
                <ha-svg-icon
                  slot="leading-icon"
                  .path=${this.schema.iconPath}
                ></ha-svg-icon>
              `
            : nothing}
        <div
          slot="header"
          role="heading"
          aria-level=${this.schema.headingLevel?.toString() ?? "3"}
        >
          ${this.schema.title || this.computeLabel?.(this.schema)}
        </div>
        <div class="content">
          ${this._renderDescription()}
          <ha-form
            .hass=${this.hass}
            .data=${this.data}
            .schema=${this.schema.schema}
            .disabled=${this.disabled}
            .computeLabel=${this._computeLabel}
            .computeHelper=${this._computeHelper}
            .localizeValue=${this.localizeValue}
          ></ha-form>
        </div>
      </ha-expansion-panel>
    `;
  }

  static styles = css`
    :host {
      display: flex !important;
      flex-direction: column;
    }
    :host ha-form {
      display: block;
    }
    .content {
      padding: 12px;
    }
    .content p {
      margin: 0 0 24px;
    }
    ha-expansion-panel {
      display: block;
      --expansion-panel-content-padding: 0;
      border-radius: 6px;
      --ha-card-border-radius: 6px;
    }
    ha-svg-icon,
    ha-icon {
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-expandable": HaFormExpendable;
  }
}
