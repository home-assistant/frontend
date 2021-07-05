import "@material/mwc-icon-button/mwc-icon-button";
import { mdiClose, mdiMenuDown } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-menu-button/paper-menu-button";
import "@polymer/paper-ripple/paper-ripple";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-svg-icon";
import { HaFormElement, HaFormSelectData, HaFormSelectSchema } from "./ha-form";

@customElement("ha-form-select")
export class HaFormSelect extends LitElement implements HaFormElement {
  @property({ attribute: false }) public schema!: HaFormSelectSchema;

  @property() public data!: HaFormSelectData;

  @property() public label!: string;

  @property() public suffix!: string;

  @query("ha-paper-dropdown-menu", true) private _input?: HTMLElement;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <paper-menu-button horizontal-align="right" vertical-offset="8">
        <div class="dropdown-trigger" slot="dropdown-trigger">
          <paper-ripple></paper-ripple>
          <paper-input
            id="input"
            type="text"
            readonly
            value=${this.data}
            label=${this.label}
            input-role="button"
            input-aria-haspopup="listbox"
            autocomplete="off"
          >
            ${this.data && this.schema.optional
              ? html`<mwc-icon-button
                  slot="suffix"
                  class="clear-button"
                  @click=${this._clearValue}
                >
                  <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
                </mwc-icon-button>`
              : ""}
            <mwc-icon-button slot="suffix">
              <ha-svg-icon .path=${mdiMenuDown}></ha-svg-icon>
            </mwc-icon-button>
          </paper-input>
        </div>
        <paper-listbox
          slot="dropdown-content"
          attr-for-selected="item-value"
          .selected=${this.data}
          @selected-item-changed=${this._valueChanged}
        >
          ${
            // TS doesn't work with union array types https://github.com/microsoft/TypeScript/issues/36390
            // @ts-ignore
            this.schema.options!.map(
              (item: string | [string, string]) => html`
                <paper-item .itemValue=${this._optionValue(item)}>
                  ${this._optionLabel(item)}
                </paper-item>
              `
            )
          }
        </paper-listbox>
      </paper-menu-button>
    `;
  }

  private _optionValue(item: string | [string, string]) {
    return Array.isArray(item) ? item[0] : item;
  }

  private _optionLabel(item: string | [string, string]) {
    return Array.isArray(item) ? item[1] || item[0] : item;
  }

  private _clearValue(ev: CustomEvent) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", { value: undefined });
  }

  private _valueChanged(ev: CustomEvent) {
    if (!ev.detail.value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: ev.detail.value.itemValue,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      paper-menu-button {
        display: block;
        padding: 0;
      }
      paper-input > mwc-icon-button {
        --mdc-icon-button-size: 24px;
        padding: 2px;
      }
      .clear-button {
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-select": HaFormSelect;
  }
}
