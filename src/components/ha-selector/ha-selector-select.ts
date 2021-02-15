import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import { HomeAssistant } from "../../types";
import { SelectSelector } from "../../data/selector";
import "../ha-paper-dropdown-menu";

@customElement("ha-selector-select")
export class HaSelectSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: SelectSelector;

  @property() public value?: string;

  @property() public label?: string;

  protected render() {
    return html`<ha-paper-dropdown-menu .label=${this.label}>
      <paper-listbox
        slot="dropdown-content"
        attr-for-selected="item-value"
        .selected=${this.value}
        @selected-item-changed=${this._valueChanged}
      >
        ${this.selector.select.options.map(
          (item: string) => html`
            <paper-item .itemValue=${item}>
              ${item}
            </paper-item>
          `
        )}
      </paper-listbox>
    </ha-paper-dropdown-menu>`;
  }

  private _valueChanged(ev) {
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
        width: 100%;
        min-width: 200px;
        display: block;
      }
      paper-listbox {
        min-width: 200px;
      }
      paper-item {
        cursor: pointer;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-select": HaSelectSelector;
  }
}
