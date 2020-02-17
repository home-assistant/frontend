import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-menu-button/paper-menu-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-ripple/paper-ripple";
import {
  customElement,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
  CSSResult,
  css,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import {
  HaFormElement,
  HaFormMultiSelectData,
  HaFormMultiSelectSchema,
} from "./ha-form";

@customElement("ha-form-multi_select")
export class HaFormMultiSelect extends LitElement implements HaFormElement {
  @property() public schema!: HaFormMultiSelectSchema;
  @property() public data!: HaFormMultiSelectData;
  @property() public label!: string;
  @property() public suffix!: string;
  @property() private _init = false;
  @query("paper-menu-button") private _input?: HTMLElement;

  public focus(): void {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    const options = Array.isArray(this.schema.options)
      ? this.schema.options
      : Object.entries(this.schema.options!);

    return html`
      <paper-menu-button horizontal-align="right" vertical-offset="8">
        <div class="dropdown-trigger" slot="dropdown-trigger">
          <paper-ripple></paper-ripple>
          <paper-input
            id="input"
            type="text"
            readonly
            value=${this.data
              .map((value) => this.schema.options![value] || value)
              .join(", ")}
            label=${this.label}
            input-role="button"
            input-aria-haspopup="listbox"
            autocomplete="off"
          >
            <iron-icon
              icon="paper-dropdown-menu:arrow-drop-down"
              suffix
              slot="suffix"
            ></iron-icon>
          </paper-input>
        </div>
        <paper-listbox
          multi
          slot="dropdown-content"
          attr-for-selected="item-value"
          .selectedValues=${this.data}
          @selected-items-changed=${this._valueChanged}
          @iron-select=${this._onSelect}
        >
          ${// TS doesn't work with union array types https://github.com/microsoft/TypeScript/issues/36390
          // @ts-ignore
          options.map((item: string | [string, string]) => {
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
      </paper-menu-button>
    `;
  }

  protected firstUpdated() {
    this.updateComplete.then(() => {
      const input = (this.shadowRoot?.querySelector("paper-input")
        ?.inputElement as any)?.inputElement;
      if (input) {
        input.style.textOverflow = "ellipsis";
      }
    });
  }

  private _optionValue(item: string | string[]): string {
    return Array.isArray(item) ? item[0] : item;
  }

  private _optionLabel(item: string | string[]): string {
    return Array.isArray(item) ? item[1] || item[0] : item;
  }

  private _onSelect(ev: Event) {
    ev.stopPropagation();
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

  static get styles(): CSSResult {
    return css`
      paper-menu-button {
        display: block;
        padding: 0;
        --paper-item-icon-width: 34px;
      }
      paper-ripple {
        top: 12px;
        left: 0px;
        bottom: 8px;
        right: 0px;
      }
      paper-input {
        text-overflow: ellipsis;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-multi_select": HaFormMultiSelect;
  }
}
