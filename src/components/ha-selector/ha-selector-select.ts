import "@material/mwc-formfield/mwc-formfield";
import "@material/mwc-list/mwc-list-item";
import { mdiClose } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import type { SelectOption, SelectSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-chip";
import "../ha-chip-set";
import "../ha-combo-box";
import "../ha-radio";
import "../ha-select";

@customElement("ha-selector-select")
export class HaSelectSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: SelectSelector;

  @property() public value?: string | string[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    const options = this.selector.select.options.map((option) =>
      typeof option === "object" ? option : { value: option, label: option }
    );

    if (this.selector.select.multiple) {
      const value =
        !this.value || this.value === "" ? [] : (this.value as string[]);

      return html`
        <ha-chip-set>
          ${value?.map(
            (item, idx) =>
              html`
                <ha-chip hasTrailingIcon>
                  ${options.find((option) => option.value === item)?.label ||
                  item}
                  <ha-svg-icon
                    slot="trailing-icon"
                    .path=${mdiClose}
                    .idx=${idx}
                    @click=${this._removeItem}
                  ></ha-svg-icon>
                </ha-chip>
              `
          )}
        </ha-chip-set>
        <ha-combo-box
          allowCustomValue=${ifDefined(this.selector.select.custom_value)}
          item-value-path="value"
          item-label-path="label"
          .hass=${this.hass}
          .label=${this.label}
          .filteredItems=${options}
          @value-changed=${this._comboBoxValueChanged}
        ></ha-combo-box>
      `;
    }

    if (this.required && options!.length < 6) {
      return html`
        <div>
          ${this.label}
          ${options.map(
            (item: SelectOption) => html`
              <mwc-formfield .label=${item.label}>
                <ha-radio
                  .checked=${item.value === this.value}
                  .value=${item.value}
                  .disabled=${this.disabled}
                  @change=${this._valueChanged}
                ></ha-radio>
              </mwc-formfield>
            `
          )}
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
        @closed=${stopPropagation}
        @selected=${this._valueChanged}
      >
        ${options.map(
          (item: SelectOption) => html`
            <mwc-list-item .value=${item.value}>${item.label}</mwc-list-item>
          `
        )}
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

  private _removeItem(ev): void {
    (this.value as string[])!.splice(ev.target.idx, 1);

    fireEvent(this, "value-changed", {
      value: this.value,
    });
    this.requestUpdate();
  }

  private _comboBoxValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newValue = ev.detail.value;

    if (this.disabled || newValue === "") {
      return;
    }

    const currentValue =
      !this.value || this.value === "" ? [] : (this.value as string[]);

    fireEvent(this, "value-changed", {
      value: [...currentValue, newValue],
    });
  }

  static styles = css`
    ha-select {
      width: 100%;
    }
    mwc-formfield {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-select": HaSelectSelector;
  }
}
