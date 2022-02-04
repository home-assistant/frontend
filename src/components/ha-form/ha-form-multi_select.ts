import { mdiMenuDown, mdiMenuUp } from "@mdi/js";
import "@material/mwc-list/mwc-check-list-item";
import "@material/mwc-textfield";
import "@material/mwc-formfield";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  TemplateResult,
  PropertyValues,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-button-menu";
import "../ha-svg-icon";
import {
  HaFormElement,
  HaFormMultiSelectData,
  HaFormMultiSelectSchema,
} from "./types";
import "../ha-checkbox";
import type { HaCheckbox } from "../ha-checkbox";

function optionValue(item: string | string[]): string {
  return Array.isArray(item) ? item[0] : item;
}

function optionLabel(item: string | string[]): string {
  return Array.isArray(item) ? item[1] || item[0] : item;
}

const SHOW_ALL_ENTRIES_LIMIT = 6;

@customElement("ha-form-multi_select")
export class HaFormMultiSelect extends LitElement implements HaFormElement {
  @property() public schema!: HaFormMultiSelectSchema;

  @property() public data!: HaFormMultiSelectData;

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

    const renderedOptions = options.map((item: string | [string, string]) => {
      const value = optionValue(item);
      return html`
        <mwc-check-list-item .checked=${data.includes(value)}>
          ${optionLabel(item)}
        </mwc-check-list-item>
      `;
    });

    // We will just render all checkboxes.
    if (options.length < SHOW_ALL_ENTRIES_LIMIT) {
      return html`<div>${this.label}${renderedOptions}</div> `;
    }

    return html`
      <ha-button-menu
        .disabled=${this.disabled}
        fixed
        corner="BOTTOM_START"
        @opened=${this._handleOpen}
        @closed=${this._handleClose}
      >
        <mwc-textfield
          slot="trigger"
          .label=${this.label}
          .value=${data
            .map((value) => this.schema.options![value] || value)
            .join(", ")}
          .disabled=${this.disabled}
          tabindex="-1"
        ></mwc-textfield>
        <ha-svg-icon
          slot="trigger"
          .path=${this._opened ? mdiMenuUp : mdiMenuDown}
        ></ha-svg-icon>
        ${renderedOptions}
      </ha-button-menu>
    `;
  }

  protected firstUpdated() {
    this.updateComplete.then(() => {
      const { formElement, mdcRoot } =
        this.shadowRoot?.querySelector("mwc-textfield") || ({} as any);
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

  static get styles(): CSSResultGroup {
    return css`
      :host([own-margin]) {
        margin-bottom: 5px;
      }
      ha-button-menu {
        display: block;
        cursor: pointer;
      }
      mwc-formfield {
        display: block;
        padding-right: 16px;
      }
      mwc-textfield {
        display: block;
        pointer-events: none;
      }
      ha-svg-icon {
        color: var(--input-dropdown-icon-color);
        position: absolute;
        right: 1em;
        top: 1em;
        cursor: pointer;
      }
      :host([opened]) ha-svg-icon {
        color: var(--primary-color);
      }
      :host([opened]) ha-button-menu {
        --mdc-text-field-idle-line-color: var(--input-hover-line-color);
        --mdc-text-field-label-ink-color: var(--primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-multi_select": HaFormMultiSelect;
  }
}
