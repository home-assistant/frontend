import { mdiClose, mdiMenuDown } from "@mdi/js";
import { css, html, LitElement, nothing, type CSSResultGroup } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-combo-box-item";
import type { HaComboBoxItem } from "./ha-combo-box-item";
import "./ha-icon-button";

declare global {
  interface HASSDomEvents {
    clear: undefined;
  }
}

@customElement("ha-picker-field")
export class HaPickerField extends LitElement {
  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property() public value?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ attribute: "hide-clear-icon", type: Boolean })
  public hideClearIcon = false;

  @query("ha-combo-box-item", true) public item!: HaComboBoxItem;

  public async focus() {
    await this.updateComplete;
    await this.item?.focus();
  }

  protected render() {
    const showClearIcon =
      !!this.value && !this.required && !this.disabled && !this.hideClearIcon;

    return html`
      <ha-combo-box-item .disabled=${this.disabled} type="button" compact>
        ${this.value
          ? html`
              <slot name="start" slot="start"></slot>
              <slot name="headline" slot="headline"></slot>
              <slot name="supporting-text" slot="supporting-text"></slot>
            `
          : html`
              <span slot="headline" class="placeholder">
                <slot name="placeholder">${this.placeholder}</slot>
              </span>
            `}
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

  private _clear(e) {
    e.stopPropagation();
    fireEvent(this, "clear");
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-combo-box-item {
          background-color: var(--mdc-text-field-fill-color, whitesmoke);
          border-radius: 4px;
          border-end-end-radius: 0;
          border-end-start-radius: 0;
          --md-list-item-one-line-container-height: 56px;
          --md-list-item-two-line-container-height: 56px;
          --md-list-item-top-space: 8px;
          --md-list-item-bottom-space: 8px;
          --md-list-item-leading-space: 8px;
          --md-list-item-trailing-space: 8px;
          --ha-md-list-item-gap: 8px;
          /* Remove the default focus ring */
          --md-focus-ring-width: 0px;
          --md-focus-ring-duration: 0s;
        }

        /* Add Similar focus style as the text field */
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
          padding: 0 8px;
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
