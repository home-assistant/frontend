import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-paper-dropdown-menu";
import { HaFormElement, HaFormSelectData, HaFormSelectSchema } from "./ha-form";

@customElement("ha-form-select")
export class HaFormSelect extends LitElement implements HaFormElement {
  @property() public schema!: HaFormSelectSchema;

  @property() public data!: HaFormSelectData;

  @property() public label!: string;

  @property() public suffix!: string;

  @query("ha-paper-dropdown-menu") private _input?: HTMLElement;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-paper-dropdown-menu .label=${this.label}>
        <paper-listbox
          slot="dropdown-content"
          attr-for-selected="item-value"
          .selected=${this.data}
          @selected-item-changed=${this._valueChanged}
        >
          ${// TS doesn't work with union array types https://github.com/microsoft/TypeScript/issues/36390
          // @ts-ignore
          this.schema.options!.map(
            (item: string | [string, string]) => html`
              <paper-item .itemValue=${this._optionValue(item)}>
                ${this._optionLabel(item)}
              </paper-item>
            `
          )}
        </paper-listbox>
      </ha-paper-dropdown-menu>
    `;
  }

  private _optionValue(item: string | [string, string]) {
    return Array.isArray(item) ? item[0] : item;
  }

  private _optionLabel(item: string | [string, string]) {
    return Array.isArray(item) ? item[1] || item[0] : item;
  }

  private _valueChanged(ev: CustomEvent) {
    if (!ev.detail.value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: ev.detail.value.itemValue,
    });
  }

  static get styles(): CSSResult {
    return css`
      ha-paper-dropdown-menu {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-select": HaFormSelect;
  }
}
