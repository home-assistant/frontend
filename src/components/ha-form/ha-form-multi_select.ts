import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-check-list-item";
import "../ha-checkbox";
import type { HaCheckbox } from "../ha-checkbox";
import "../ha-dropdown";
import "../ha-dropdown-item";
import "../ha-formfield";
import "../ha-icon-button";
import "../ha-picker-field";

import type { HaDropdown } from "../ha-dropdown";
import type { HaDropdownItem } from "../ha-dropdown-item";
import type {
  HaFormElement,
  HaFormMultiSelectData,
  HaFormMultiSelectSchema,
} from "./types";

function optionValue(item: string | string[]): string {
  return Array.isArray(item) ? item[0] : item;
}

function optionLabel(item: string | string[]): string {
  return Array.isArray(item) ? item[1] || item[0] : item;
}

const SHOW_ALL_ENTRIES_LIMIT = 6;

@customElement("ha-form-multi_select")
export class HaFormMultiSelect extends LitElement implements HaFormElement {
  @property({ attribute: false }) public schema!: HaFormMultiSelectSchema;

  @property({ attribute: false }) public data!: HaFormMultiSelectData;

  @property() public label!: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @query("ha-dropdown") private _dropdown!: HaDropdown;

  public focus(): void {
    this._dropdown?.focus();
  }

  protected render(): TemplateResult {
    const options = Array.isArray(this.schema.options)
      ? this.schema.options
      : Object.entries(this.schema.options);
    const data = this.data || [];

    // We will just render all checkboxes.
    if (options.length < SHOW_ALL_ENTRIES_LIMIT) {
      return html`<div>
        ${this.label}${options.map((item: string | [string, string]) => {
          const value = optionValue(item);
          return html`
            <ha-formfield .label=${optionLabel(item)}>
              <ha-checkbox
                .checked=${data.includes(value)}
                .value=${value}
                .disabled=${this.disabled}
                @change=${this._valueChanged}
              ></ha-checkbox>
            </ha-formfield>
          `;
        })}
      </div> `;
    }

    return html`
      <ha-dropdown
        @wa-select=${this._toggleItem}
        @wa-show=${this._showDropdown}
        placement="bottom"
        tabindex="0"
        @keydown=${this._handleKeydown}
      >
        <ha-picker-field
          slot="trigger"
          .label=${this.label}
          .value=${data
            .map(
              (value) =>
                optionLabel(options.find((v) => optionValue(v) === value)) ||
                value
            )
            .join(", ")}
          .disabled=${this.disabled}
          hide-clear-icon
        >
        </ha-picker-field>
        ${options.map((item: string | [string, string]) => {
          const value = optionValue(item);
          const selected = data.includes(value);
          return html`<ha-dropdown-item
            .value=${value}
            .action=${selected ? "remove" : "add"}
            type="checkbox"
            .checked=${selected}
          >
            ${optionLabel(item)}
          </ha-dropdown-item>`;
        })}
      </ha-dropdown>
    `;
  }

  protected _toggleItem(ev: CustomEvent<{ item: HaDropdownItem }>) {
    ev.preventDefault(); // keep the dropdown open
    const value = ev.detail.item.value;
    const action = (ev.detail.item as any).action;

    const oldData = this.data || [];
    let newData: string[];
    if (action === "add") {
      newData = [...oldData, value];
    } else {
      newData = oldData.filter((d) => d !== value);
    }
    fireEvent(this, "value-changed", {
      value: newData,
    });
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("schema")) {
      this.toggleAttribute(
        "own-margin",
        Object.keys(this.schema.options).length >= SHOW_ALL_ENTRIES_LIMIT &&
          !!this.schema.required
      );
    }
  }

  private _valueChanged(ev: CustomEvent): void {
    const { value, checked } = ev.target as HaCheckbox;
    this._handleValueChanged(value, checked);
  }

  private _handleValueChanged(value, checked: boolean): void {
    let newValue: string[];

    if (checked) {
      if (!this.data) {
        newValue = [value];
      } else if (this.data.includes(value)) {
        return;
      } else {
        newValue = [...this.data, value];
      }
    } else {
      if (!this.data.includes(value)) {
        return;
      }
      newValue = this.data.filter((v) => v !== value);
    }

    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  private _showDropdown(ev) {
    if (this.disabled) {
      ev.preventDefault();
    }
    this.style.setProperty(
      "--dropdown-width",
      `${this._dropdown.offsetWidth}px`
    );
  }

  private _handleKeydown(ev) {
    if ((ev.code === "Space" || ev.code === "Enter") && this._dropdown) {
      this._dropdown.open = true;
    }
  }

  static styles = css`
    :host([own-margin]) {
      margin-bottom: 5px;
    }
    ha-dropdown {
      display: block;
    }
    ha-formfield {
      display: block;
      padding-right: 16px;
      padding-inline-end: 16px;
      padding-inline-start: initial;
      direction: var(--direction);
    }
    ha-textfield {
      display: block;
      width: 100%;
      pointer-events: none;
    }
    ha-icon-button {
      color: var(--input-dropdown-icon-color);
      position: absolute;
      right: 1em;
      top: 4px;
      cursor: pointer;
      inset-inline-end: 1em;
      inset-inline-start: initial;
      direction: var(--direction);
    }
    :host([opened]) ha-icon-button {
      color: var(--primary-color);
    }

    ha-dropdown::part(menu) {
      border-top-left-radius: 0;
      border-top-right-radius: 0;
      width: var(--dropdown-width);
    }

    :host([disabled]) ha-dropdown ha-picker-field {
      cursor: not-allowed;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-multi_select": HaFormMultiSelect;
  }
}
