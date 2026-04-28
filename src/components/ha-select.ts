import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import "./ha-dropdown";
import "./ha-dropdown-item";
import "./ha-input-helper-text";
import "./ha-picker-field";
import type { HaPickerField } from "./ha-picker-field";
import "./ha-svg-icon";

export interface HaSelectOption {
  value: string | number;
  label?: string;
  secondary?: string;
  iconPath?: string;
  disabled?: boolean;
}

/**
 * Event type for the ha-select component when an item is selected.
 * @param T - The type of the value of the selected item.
 * @param Clearable - Whether the select is clearable (allows undefined values).
 */
export type HaSelectSelectEvent<
  T = string,
  Clearable extends boolean = false,
> = CustomEvent<{
  value: Clearable extends true ? T | undefined : T;
}>;

@customElement("ha-select")
export class HaSelect extends LitElement {
  @property({ type: Boolean }) public clearable = false;

  @property({ attribute: false }) public options?:
    | HaSelectOption[]
    | string[]
    | number[];

  @property() public label?: string;

  @property() public helper?: string;

  @property() public value?: string | number;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean }) public disabled = false;

  @state() private _opened = false;

  @query("ha-picker-field") private _triggerField!: HaPickerField;

  private _getValueLabel = memoizeOne(
    (
      options: HaSelectOption[] | string[] | number[] | undefined,
      value: string | number | undefined
    ) => {
      // just in case value is a number, convert it to string to avoid falsy value
      const valueStr = String(value);
      if (!options || !valueStr) {
        return valueStr;
      }

      for (const option of options) {
        const simpleOption = ["string", "number"].includes(typeof option);
        if (
          (simpleOption && option === valueStr) ||
          (!simpleOption &&
            String((option as HaSelectOption).value) === valueStr)
        ) {
          return simpleOption
            ? option
            : (option as HaSelectOption).label ||
                (option as HaSelectOption).value;
        }
      }

      return valueStr;
    }
  );

  protected override render() {
    if (this.disabled) {
      return html`${this._renderField()}${this._renderHelper()}`;
    }

    return html`
      <ha-dropdown
        placement="bottom"
        @wa-select=${this._handleSelect}
        @wa-show=${this._handleShow}
        @wa-hide=${this._handleHide}
      >
        ${this._renderField()}
        ${this.options
          ? this.options.map((option) => {
              const simpleOption = ["string", "number"].includes(typeof option);
              return html`
                <ha-dropdown-item
                  .value=${simpleOption ? option : option.value}
                  .disabled=${simpleOption ? false : (option.disabled ?? false)}
                  .selected=${this.value ===
                  (simpleOption ? option : option.value)}
                >
                  ${option.iconPath
                    ? html`<ha-svg-icon
                        slot="icon"
                        .path=${option.iconPath}
                      ></ha-svg-icon>`
                    : nothing}
                  <div class="content">
                    ${simpleOption ? option : option.label || option.value}
                    ${option.secondary
                      ? html`<div class="secondary">${option.secondary}</div>`
                      : nothing}
                  </div>
                </ha-dropdown-item>
              `;
            })
          : html`<slot></slot>`}
      </ha-dropdown>
      ${this._renderHelper()}
    `;
  }

  private _renderField() {
    const valueLabel = this._getValueLabel(this.options, this.value);

    return html`
      <ha-picker-field
        slot="trigger"
        type="button"
        class=${this._opened ? "opened" : ""}
        compact
        aria-label=${ifDefined(this.label)}
        @clear=${this._clearValue}
        .label=${this.label}
        .value=${valueLabel}
        .required=${this.required}
        .disabled=${this.disabled}
        .hideClearIcon=${!this.clearable ||
        this.required ||
        this.disabled ||
        !String(this.value)}
      >
      </ha-picker-field>
    `;
  }

  private _renderHelper() {
    return this.helper
      ? html`<ha-input-helper-text .disabled=${this.disabled}
          >${this.helper}</ha-input-helper-text
        >`
      : nothing;
  }

  private _handleSelect(ev: CustomEvent<{ item: { value: string | number } }>) {
    ev.stopPropagation();
    const value = ev.detail.item.value;
    if (value === this.value) {
      return;
    }
    fireEvent(this, "selected", { value });
  }

  private _clearValue(): void {
    if (this.disabled || !this.value) {
      return;
    }

    fireEvent(this, "selected", { value: undefined });
  }

  private _handleShow() {
    this.style.setProperty(
      "--select-menu-width",
      `${this._triggerField.offsetWidth}px`
    );
    this._opened = true;
  }

  private _handleHide() {
    this._opened = false;
  }

  static styles = css`
    :host {
      position: relative;
    }
    ha-picker-field.opened {
      --mdc-text-field-idle-line-color: var(--primary-color);
    }
    ha-dropdown-item .content {
      display: flex;
      gap: var(--ha-space-1);
      flex-direction: column;
    }

    ha-dropdown-item .secondary {
      font-size: var(--ha-font-size-s);
      color: var(--ha-color-text-secondary);
    }

    ha-dropdown::part(menu) {
      min-width: var(--select-menu-width);
    }

    ha-input-helper-text {
      display: block;
      margin: var(--ha-space-2) 0 0;
    }
  `;
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-select": HaSelect;
  }

  interface HASSDomEvents {
    selected: { value: string | number | undefined };
  }
}
