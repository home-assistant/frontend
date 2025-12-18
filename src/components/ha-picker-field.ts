import { consume } from "@lit/context";
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
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../common/dom/fire_event";
import { localizeContext } from "../data/context";
import { PickerMixin } from "../mixins/picker-mixin";
import type { HomeAssistant } from "../types";
import "./ha-combo-box-item";
import type { HaComboBoxItem } from "./ha-combo-box-item";
import "./ha-icon";
import "./ha-icon-button";

declare global {
  interface HASSDomEvents {
    clear: undefined;
  }
}

export type PickerValueRenderer = (value: string) => TemplateResult<1>;

@customElement("ha-picker-field")
export class HaPickerField extends PickerMixin(LitElement) {
  @property({ type: Boolean, reflect: true }) public invalid = false;

  @query("ha-combo-box-item", true) public item!: HaComboBoxItem;

  @state()
  @consume({ context: localizeContext, subscribe: true })
  private localize!: HomeAssistant["localize"];

  public async focus() {
    await this.updateComplete;
    await this.item?.focus();
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
      <ha-combo-box-item
        aria-label=${ifDefined(this.label || this.placeholder)}
        .disabled=${this.disabled}
        type="button"
        compact
      >
        ${this.image
          ? html`<img
              alt=${this.label ?? ""}
              slot="start"
              .src=${this.image}
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
            />`
          : this.icon
            ? html`<ha-icon slot="start" .icon=${this.icon}></ha-icon>`
            : html`<slot name="start"></slot>`}
        ${overlineLabel}${headlineContent}
        ${this.unknown
          ? html`<div slot="supporting-text" class="unknown">
              ${this.unknownItemText ||
              this.localize("ui.components.combo-box.unknown_item")}
            </div>`
          : nothing}
        ${showClearIcon
          ? html`
              <ha-icon-button
                class="clear"
                slot="end"
                @click=${this._clear}
                .path=${mdiClose}
              ></ha-icon-button>
            `
          : nothing}
        <ha-svg-icon
          class="arrow"
          slot="end"
          .path=${mdiMenuDown}
        ></ha-svg-icon>
      </ha-combo-box-item>
    `;
  }

  private _clear(e: CustomEvent) {
    e.stopPropagation();
    fireEvent(this, "clear");
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-combo-box-item[disabled] {
          background-color: var(
            --mdc-text-field-disabled-fill-color,
            whitesmoke
          );
        }
        ha-combo-box-item {
          background-color: var(--mdc-text-field-fill-color, whitesmoke);
          border-radius: var(--ha-border-radius-sm);
          border-end-end-radius: 0;
          border-end-start-radius: 0;
          --md-list-item-one-line-container-height: 56px;
          --md-list-item-two-line-container-height: 56px;
          --md-list-item-top-space: 0px;
          --md-list-item-bottom-space: 0px;
          --md-list-item-leading-space: var(--ha-space-4);
          --md-list-item-trailing-space: var(--ha-space-2);
          --ha-md-list-item-gap: var(--ha-space-2);
          /* Remove the default focus ring */
          --md-focus-ring-width: 0px;
          --md-focus-ring-duration: 0s;
        }

        /* Add Similar focus style as the text field */
        ha-combo-box-item[disabled]:after {
          background-color: var(
            --mdc-text-field-disabled-line-color,
            rgba(0, 0, 0, 0.42)
          );
        }
        ha-combo-box-item:after {
          display: block;
          content: "";
          position: absolute;
          pointer-events: none;
          bottom: 0;
          left: 0;
          right: 0;
          height: 1px;
          width: 100%;
          background-color: var(
            --mdc-text-field-idle-line-color,
            rgba(0, 0, 0, 0.42)
          );
          transform:
            height 180ms ease-in-out,
            background-color 180ms ease-in-out;
        }

        ha-combo-box-item:focus:after {
          height: 2px;
          background-color: var(--mdc-theme-primary);
        }

        :host([unknown]) ha-combo-box-item {
          background-color: var(--ha-color-fill-warning-quiet-resting);
        }

        :host([invalid]) ha-combo-box-item:after {
          height: 2px;
          background-color: var(--mdc-theme-error, var(--error-color, #b00020));
        }

        .clear {
          margin: 0 -8px;
          --mdc-icon-button-size: 32px;
          --mdc-icon-size: 20px;
        }
        .arrow {
          --mdc-icon-size: 20px;
          width: 32px;
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
