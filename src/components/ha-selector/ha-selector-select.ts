import "@material/mwc-formfield/mwc-formfield";
import "@material/mwc-list/mwc-list-item";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import type { SelectOption, SelectSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-radio";
import "../ha-select";

@customElement("ha-selector-select")
export class HaSelectSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: SelectSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    if (this.required && this.selector.select.options!.length < 6) {
      return html`
        <div>
          ${this.label}
          ${this.selector.select.options.map((item: string | SelectOption) => {
            const value = typeof item === "object" ? item.value : item;
            const label = typeof item === "object" ? item.label : item;

            return html`
              <mwc-formfield .label=${label}>
                <ha-radio
                  .checked=${value === this.value}
                  .value=${value}
                  .disabled=${this.disabled}
                  @change=${this._valueChanged}
                ></ha-radio>
              </mwc-formfield>
            `;
          })}
        </div>
      `;
    }

    return html`
      <ha-select
        fixedMenuPosition
        naturalMenuWidth
        .label=${this.label}
        .value=${this.value}
        .helper=${this.helper}
        .disabled=${this.disabled}
        .required=${this.required}
        @closed=${stopPropagation}
        @selected=${this._valueChanged}
      >
        ${this.selector.select.options.map((item: string | SelectOption) => {
          const value = typeof item === "object" ? item.value : item;
          const label = typeof item === "object" ? item.label : item;

          return html`<mwc-list-item .value=${value}>${label}</mwc-list-item>`;
        })}
      </ha-select>
    `;
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
      ha-select {
        width: 100%;
      }
      mwc-formfield {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-select": HaSelectSelector;
  }
}
