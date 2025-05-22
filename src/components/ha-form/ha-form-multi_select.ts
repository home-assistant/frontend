import { mdiMenuDown, mdiMenuUp } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-button-menu";
import "../ha-check-list-item";
import "../ha-checkbox";
import type { HaCheckbox } from "../ha-checkbox";
import "../ha-formfield";
import "../ha-icon-button";
import "../ha-textfield";
import "../ha-md-button-menu";
import "../ha-md-menu-item";

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

  @property({ type: Boolean }) public disabled = false;

  @state() private _opened = false;

  @query("ha-button-menu") private _input?: HTMLElement;

  public focus(): void {
    if (this._input) {
      this._input.focus();
    }
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
      <ha-md-button-menu
        .disabled=${this.disabled}
        @opening=${this._handleOpen}
        @closing=${this._handleClose}
        positioning="fixed"
      >
        <ha-textfield
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
          tabindex="-1"
        ></ha-textfield>
        <ha-icon-button
          slot="trigger"
          .label=${this.label}
          .path=${this._opened ? mdiMenuUp : mdiMenuDown}
        ></ha-icon-button>
        ${options.map((item: string | [string, string]) => {
          const value = optionValue(item);
          const selected = data.includes(value);
          return html`<ha-md-menu-item
            type="option"
            aria-checked=${selected}
            .value=${value}
            .action=${selected ? "remove" : "add"}
            .activated=${selected}
            @click=${this._toggleItem}
            @keydown=${this._keydown}
            keep-open
          >
            <ha-checkbox
              slot="start"
              tabindex="-1"
              .checked=${selected}
            ></ha-checkbox>
            ${optionLabel(item)}
          </ha-md-menu-item>`;
        })}
      </ha-md-button-menu>
    `;
  }

  protected _keydown(ev) {
    if (ev.code === "Space" || ev.code === "Enter") {
      ev.preventDefault();
      this._toggleItem(ev);
    }
  }

  protected _toggleItem(ev) {
    const oldData = this.data || [];
    let newData: string[];
    if (ev.currentTarget.action === "add") {
      newData = [...oldData, ev.currentTarget.value];
    } else {
      newData = oldData.filter((d) => d !== ev.currentTarget.value);
    }
    fireEvent(this, "value-changed", {
      value: newData,
    });
  }

  protected firstUpdated() {
    this.updateComplete.then(() => {
      const { formElement, mdcRoot } =
        this.shadowRoot?.querySelector("ha-textfield") || ({} as any);
      if (formElement) {
        formElement.style.textOverflow = "ellipsis";
      }
      if (mdcRoot) {
        mdcRoot.style.cursor = "pointer";
      }
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

  private _handleOpen(ev: Event): void {
    ev.stopPropagation();
    this._opened = true;
    this.toggleAttribute("opened", true);
  }

  private _handleClose(ev: Event): void {
    ev.stopPropagation();
    this._opened = false;
    this.toggleAttribute("opened", false);
  }

  static styles = css`
    :host([own-margin]) {
      margin-bottom: 5px;
    }
    ha-md-button-menu {
      display: block;
      cursor: pointer;
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
    :host([opened]) ha-md-button-menu {
      --mdc-text-field-idle-line-color: var(--input-hover-line-color);
      --mdc-text-field-label-ink-color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-multi_select": HaFormMultiSelect;
  }
}
