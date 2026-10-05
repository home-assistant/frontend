import type { ContextType } from "@lit/context";
import { mdiClose, mdiMenuDown } from "@mdi/js";
import {
  css,
  html,
  LitElement,
  nothing,
  type CSSResultGroup,
  type TemplateResult,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { consume } from "../common/decorators/consume";
import { fireEvent } from "../common/dom/fire_event";
import { internationalizationContext } from "../data/context";
import { PickerMixin } from "../mixins/picker-mixin";
import "./ha-combo-box-item";
import "./ha-icon";
import "./ha-icon-button";
import "./ha-ripple";
import "./ha-svg-icon";

declare global {
  interface HASSDomEvents {
    clear: undefined;
  }
}

export type PickerValueRenderer = (value: string) => TemplateResult<1>;

@customElement("ha-picker-field")
export class HaPickerField extends PickerMixin(LitElement) {
  @property({ type: Boolean, reflect: true }) public invalid = false;

  @property({ type: String, attribute: "aria-label" })
  public ariaLabel: string | null = null;

  @query("#trigger", true) private _trigger?: HTMLButtonElement;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  public async focus() {
    await this.updateComplete;
    this._trigger?.focus();
  }

  protected render() {
    const hasValue = !!this.value;

    const showClearIcon =
      !!this.value && !this.required && !this.disabled && !this.hideClearIcon;

    const placeholderText = this.placeholder ?? this.label;

    const overlineLabel =
      this.label && hasValue
        ? html`<span slot="overline"
            >${this.label}${this.required ? " *" : ""}</span
          >`
        : nothing;

    const labelShown = !!this.label && (hasValue || !this.placeholder);
    const hiddenLabel = labelShown ? undefined : this.ariaLabel || this.label;

    const headlineContent = hasValue
      ? this.valueRenderer
        ? this.valueRenderer(this.value ?? "")
        : html`<span slot="headline">${this.value}</span>`
      : placeholderText
        ? html`<span slot="headline" class="placeholder">
            ${placeholderText}${this.required ? " *" : ""}
          </span>`
        : nothing;

    return html`
      <div class=${classMap({ field: true, disabled: this.disabled })}>
        <ha-ripple .disabled=${this.disabled}></ha-ripple>
        ${
          hiddenLabel
            ? html`<span id="hidden-label" hidden>${hiddenLabel}</span>`
            : nothing
        }
        <button
          id="trigger"
          class="trigger"
          type="button"
          aria-labelledby=${ifDefined(
            hiddenLabel ? "hidden-label trigger" : undefined
          )}
          ?disabled=${this.disabled}
        >
          <ha-combo-box-item .disabled=${this.disabled}>
            ${
              this.image
                ? html`<img
                    alt=${this.label ?? ""}
                    slot="start"
                    .src=${this.image}
                    crossorigin="anonymous"
                    referrerpolicy="no-referrer"
                  />`
                : this.icon
                  ? html`<ha-icon slot="start" .icon=${this.icon}></ha-icon>`
                  : html`<slot name="start" slot="start"></slot>`
            }
            ${overlineLabel}${headlineContent}
            ${
              this.unknown
                ? html`<div slot="supporting-text" class="unknown">
                    ${
                      this.unknownItemText ||
                      this._i18n?.localize(
                        "ui.components.combo-box.unknown_item"
                      )
                    }
                  </div>`
                : nothing
            }
          </ha-combo-box-item>
        </button>
        ${
          showClearIcon
            ? html`
                <ha-icon-button
                  class="clear"
                  .label=${this._i18n?.localize("ui.common.clear")}
                  @click=${this._clear}
                  .path=${mdiClose}
                ></ha-icon-button>
              `
            : nothing
        }
        <ha-svg-icon class="arrow" .path=${mdiMenuDown}></ha-svg-icon>
      </div>
    `;
  }

  private _clear(e: CustomEvent) {
    e.stopPropagation();
    fireEvent(this, "clear");
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .field {
          position: relative;
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          padding-inline-end: var(--ha-space-2);
          box-sizing: border-box;
          background-color: var(--ha-color-form-background);
          border-radius: var(--ha-border-radius-sm);
          border-end-end-radius: 0;
          border-end-start-radius: 0;
          cursor: pointer;
          --ha-ripple-color: var(--primary-text-color);
        }

        .field.disabled {
          background-color: var(--ha-color-form-background-disabled);
          opacity: 0.5;
          cursor: not-allowed;
        }

        .trigger {
          display: flex;
          flex: 1;
          min-width: 0;
          align-self: stretch;
          margin: 0;
          padding: 0;
          border: none;
          background: none;
          color: inherit;
          font: inherit;
          text-align: start;
          cursor: inherit;
          -webkit-tap-highlight-color: transparent;
        }

        /* The bottom line shows focus instead */
        .trigger:focus-visible {
          outline: none;
        }

        ha-combo-box-item {
          flex: 1;
          min-width: 0;
          --ha-combo-box-item-min-height: 56px;
          --ha-combo-box-item-two-line-min-height: 56px;
          --ha-combo-box-item-padding-block: 0px;
          --ha-combo-box-item-padding-inline-start: var(--ha-space-4);
          --ha-combo-box-item-padding-inline-end: 0px;
          --ha-combo-box-item-gap: var(--ha-space-2);
          --ha-combo-box-item-disabled-opacity: 0.5;
        }

        .field:after {
          display: block;
          content: "";
          position: absolute;
          pointer-events: none;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          width: 100%;
          background-color: var(--ha-color-border-neutral-loud);
          transform:
            height 180ms ease-in-out,
            background-color 180ms ease-in-out;
        }

        .field:focus-within:after {
          height: 2px;
          background-color: var(--mdc-theme-primary);
        }

        :host([unknown]) .field {
          background-color: var(--ha-color-fill-warning-quiet-resting);
        }

        :host([invalid]) .field:after {
          height: 2px;
          background-color: var(--mdc-theme-error, var(--error-color, #b00020));
        }

        .clear {
          margin: 0 -8px;
          color: var(--secondary-text-color);
          --ha-icon-button-size: 32px;
          --ha-icon-button-padding-inline: var(--ha-space-1);
        }
        .arrow {
          --mdc-icon-size: 20px;
          width: 32px;
          flex: none;
          color: var(--secondary-text-color);
        }

        .placeholder {
          color: var(--secondary-text-color);
        }

        :host([invalid]) .placeholder {
          color: var(--mdc-theme-error, var(--error-color, #b00020));
        }

        .unknown {
          color: var(--ha-color-on-warning-normal);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-picker-field": HaPickerField;
  }
}
