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
import "./input/ha-input-label";

declare global {
  interface HASSDomEvents {
    clear: undefined;
  }
}

export type PickerValueRenderer = (value: string) => TemplateResult<1>;

@customElement("ha-picker-field")
export class HaPickerField extends PickerMixin(LitElement) {
  @property({ type: Boolean, reflect: true }) public invalid = false;

  @property({ type: Boolean, reflect: true }) public open = false;

  @query("ha-combo-box-item", true) public item!: HaComboBoxItem;

  @state()
  @consume({ context: localizeContext, subscribe: true })
  private localize!: HomeAssistant["localize"];

  public async focus() {
    await this.updateComplete;
    await this.item?.focus();
  }

  protected render() {
    const showClearIcon =
      !!this.value && !this.required && !this.disabled && !this.hideClearIcon;

    const placeholder = this.placeholder || this.label;

    const headlineContent = this.value
      ? this.valueRenderer
        ? this.valueRenderer(this.value ?? "")
        : html`<span slot="headline">${this.value}</span>`
      : placeholder
        ? html`<span slot="headline" class="placeholder">
            ${placeholder}${this.required ? " *" : ""}
          </span>`
        : nothing;

    return html`
      ${this.label
        ? html` <ha-input-label .label=${this.label}></ha-input-label> `
        : nothing}
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
        ${headlineContent}
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
        ha-combo-box-item {
          position: relative;
          background-color: var(--wa-form-control-background-color);
          border-radius: var(--ha-border-radius-lg);
          border-width: 1px;
          border-style: solid;
          border-color: var(--wa-form-control-border-color);
          --md-list-item-one-line-container-height: 48px;
          --md-list-item-two-line-container-height: 48px;
          --md-list-item-top-space: 0px;
          --md-list-item-bottom-space: 0px;
          --md-list-item-leading-space: var(--ha-space-4);
          --md-list-item-trailing-space: var(--ha-space-2);
          --ha-md-list-item-gap: var(--ha-space-2);
          /* Remove the default focus ring */
          --md-focus-ring-width: 0px;
          --md-focus-ring-duration: 0s;
        }

        ha-combo-box-item[disabled] {
          background-color: var(--ha-color-fill-disabled-loud-resting);
        }

        ha-combo-box-item:focus,
        :host([open]) ha-combo-box-item {
          border-color: var(--ha-color-border-primary-normal);
        }

        :host([open]) ha-combo-box-item {
          background-color: var(--ha-color-fill-neutral-quiet-resting);
        }

        :host([unknown]) ha-combo-box-item {
          border-color: var(--ha-color-border-warning-normal);
          background-color: var(--ha-color-fill-warning-quiet-resting);
        }

        :host([invalid]) ha-combo-box-item {
          border-color: var(--ha-color-border-danger-normal);
          background-color: var(--ha-color-fill-danger-quiet-resting);
        }

        .clear {
          margin: 0 -8px;
          --ha-icon-button-size: 32px;
          --ha-icon-button-padding-inline: var(--ha-space-1);
        }
        .arrow {
          --mdc-icon-size: 20px;
          width: 32px;
        }

        .placeholder {
          color: var(--secondary-text-color);
        }

        :host([open]) {
          --ha-input-label-background: var(--ha-color-fill-primary-quiet-hover);
        }

        :host([invalid]) {
          --ha-input-label-background: var(
            --ha-color-fill-danger-quiet-resting
          );
        }

        :host([open][invalid]) {
          --ha-input-label-background: var(--ha-color-fill-danger-quiet-hover);
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
