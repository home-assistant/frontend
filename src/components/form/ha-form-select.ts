import {
  customElement,
  LitElement,
  html,
  property,
  TemplateResult,
  query,
} from "lit-element";
import { HaFormElement, HaFormSchema } from "./ha-form";
import { fireEvent } from "../../common/dom/fire_event";

import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-item/paper-item";
// Not duplicate, is for typing
// tslint:disable-next-line
import { PaperListboxElement } from "@polymer/paper-listbox/paper-listbox";

@customElement("ha-form-select")
export class HaFormSelect extends LitElement implements HaFormElement {
  @property() public schema!: HaFormSchema;
  @property() public data!: { [key: string]: any };
  @property() public label!: string;
  @property() public suffix!: string;
  @query("paper-dropdown-menu") private _input?: HTMLElement;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <paper-dropdown-menu label=${this.label}>
        <paper-listbox
          slot="dropdown-content"
          attr-for-selected="item-name"
          .selected=${this.data}
          @change=${this._valueChanged}
        >
          ${this.schema.options!.map(
            (item) => html`
              <paper-item .item-name=${this._optionValue(item)}
                >${this._optionLabel(item)}</paper-item
              >
            `
          )}
        </paper-listbox>
      </paper-dropdown-menu>
    `;
  }

  private _optionValue(item) {
    return Array.isArray(item) ? item[0] : item;
  }

  private _optionLabel(item) {
    return Array.isArray(item) ? item[1] : item;
  }

  private _valueChanged(ev: Event) {
    fireEvent(
      this,
      "value-changed",
      {
        value: (ev.target as PaperListboxElement).selected,
      },
      { bubbles: false }
    );
  }
}
