import {
  customElement,
  LitElement,
  html,
  property,
  TemplateResult,
  query,
} from "lit-element";
import {
  HaFormElement,
  HaFormMultiSelectSchema,
  HaFormMultiSelectData,
} from "./ha-form";
import { fireEvent } from "../../common/dom/fire_event";

import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-checkbox/paper-checkbox";

@customElement("ha-form-multi_select")
export class HaFormMultiSelect extends LitElement implements HaFormElement {
  @property() public schema!: HaFormMultiSelectSchema;
  @property() public data!: HaFormMultiSelectData;
  @property() public label!: string;
  @property() public suffix!: string;
  @property() private _init = false;
  @query("paper-dropdown-menu") private _input?: HTMLElement;

  public focus(): void {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <paper-listbox
        multi
        attr-for-selected="item-value"
        .selectedValues=${this.data}
        @selected-items-changed=${this._valueChanged}
      >
        ${this.schema.options!.map((item) => {
          const value = this._optionValue(item);
          return html`
            <paper-icon-item .itemValue=${value}>
              <paper-checkbox
                .checked=${this.data.includes(value)}
                slot="item-icon"
              ></paper-checkbox>
              ${this._optionLabel(item)}
            </paper-icon-item>
          `;
        })}
      </paper-listbox>
    `;
  }

  private _optionValue(item: string | string[]): string | string[] {
    return Array.isArray(item) ? item[0] : item;
  }

  private _optionLabel(item: string | string[]): string | string[] {
    return Array.isArray(item) ? item[1] : item;
  }

  private _valueChanged(ev: CustomEvent): void {
    if (!ev.detail.value || !this._init) {
      // ignore first call because that is the init of the component
      this._init = true;
      return;
    }

    fireEvent(
      this,
      "value-changed",
      {
        value: ev.detail.value.map((element) => element.itemValue),
      },
      { bubbles: false }
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-multi_select": HaFormMultiSelect;
  }
}
