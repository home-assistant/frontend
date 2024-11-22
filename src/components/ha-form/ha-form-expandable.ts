import { mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type { HomeAssistant } from "../../types";
import { computeInitialHaFormData } from "./compute-initial-ha-form-data";
import { haStyle } from "../../resources/styles";
import "./ha-form";
import "../ha-button";
import type {
  HaFormDataContainer,
  HaFormElement,
  HaFormExpandableSchema,
  HaFormSchema,
} from "./types";

@customElement("ha-form-expandable")
export class HaFormExpendable extends LitElement implements HaFormElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data!:
    | HaFormDataContainer
    | HaFormDataContainer[];

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

  private _valueChanged(ev) {
    if (this.schema.multiple) {
      ev.stopPropagation();
      const data = [...(this.data as HaFormDataContainer[])];
      data[ev.target.index] = ev.detail.value;
      fireEvent(this, "value-changed", { value: data });
    }
  }

  private _addItem() {
    const data = [
      ...(this.data as HaFormDataContainer[]),
      computeInitialHaFormData(this.schema.schema),
    ];
    fireEvent(this, "value-changed", { value: data });
  }

  protected render() {
    return html` ${this.schema.multiple ? this._renderDescription() : nothing}
    ${this.schema.multiple
      ? (this.data as HaFormDataContainer[]).map((d, idx) =>
          this.renderPanel(d, idx)
        )
      : this.renderPanel(this.data as HaFormDataContainer, 0)}
    ${this.schema.multiple
      ? html`
          <div class="layout horizontal center-center">
            <ha-button @click=${this._addItem} .disabled=${this.disabled}>
              ${this.hass?.localize("ui.common.add") ?? "Add"}
              <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
            </ha-button>
          </div>
        `
      : nothing}`;
  }

  private renderPanel(data: HaFormDataContainer, index) {
    return html`
      <ha-expansion-panel outlined .expanded=${Boolean(this.schema.expanded)}>
        <div
          slot="header"
          role="heading"
          aria-level=${this.schema.headingLevel?.toString() ?? "3"}
        >
          ${this.schema.icon
            ? html` <ha-icon .icon=${this.schema.icon}></ha-icon> `
            : this.schema.iconPath
              ? html`
                  <ha-svg-icon .path=${this.schema.iconPath}></ha-svg-icon>
                `
              : nothing}
          ${this.schema.title || this.computeLabel?.(this.schema)}
        </div>
        <div class="content">
          ${this.schema.multiple ? nothing : this._renderDescription()}
          <ha-form
            .hass=${this.hass}
            .data=${data}
            .index=${index}
            .schema=${this.schema.schema}
            .disabled=${this.disabled}
            .computeLabel=${this._computeLabel}
            .computeHelper=${this._computeHelper}
            .localizeValue=${this.localizeValue}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
      </ha-expansion-panel>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-expandable": HaFormExpendable;
  }
}
