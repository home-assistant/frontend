import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import { SelectOption, SelectSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "@material/mwc-select/mwc-select";
import "@material/mwc-list/mwc-list-item";

@customElement("ha-selector-select")
export class HaSelectSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: SelectSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  protected render() {
    return html`<mwc-select
      fixedMenuPosition
      naturalMenuWidth
      .label=${this.label}
      .value=${this.value}
      .helper=${this.helper}
      .disabled=${this.disabled}
      @closed=${stopPropagation}
      @selected=${this._valueChanged}
    >
      ${this.selector.select.options.map((item: string | SelectOption) => {
        const value = typeof item === "object" ? item.value : item;
        const label = typeof item === "object" ? item.label : item;

        return html`<mwc-list-item .value=${value}>${label}</mwc-list-item>`;
      })}
    </mwc-select>`;
  }

  private _valueChanged(ev) {
    ev.stopPropagation();
    if (this.disabled || !ev.target.value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: ev.target.value,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      mwc-select {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-select": HaSelectSelector;
  }
}
