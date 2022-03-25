import "@material/mwc-formfield/mwc-formfield";
import "@material/mwc-list/mwc-list-item";
import { mdiClose } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import type { SelectOption, SelectSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-checkbox";
import "../ha-chip";
import "../ha-chip-set";
import type { HaComboBox } from "../ha-combo-box";
import "../ha-formfield";
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

  @query("ha-combo-box", true) private comboBox!: HaComboBox;

  private _filter = "";

  protected render() {
    const options = this.selector.select.options.map((option) =>
      typeof option === "object" ? option : { value: option, label: option }
    );

    if (!this.selector.select.custom_value && this._mode === "list") {
      if (this.required) {
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
        <div>
          ${this.label}${options.map(
            (item: SelectOption) => html`
              <ha-formfield .label=${item.label}>
                <ha-checkbox
                  .checked=${this.value?.includes(item.value)}
                  .value=${item.value}
                  .disabled=${this.disabled}
                  @change=${this._valueChanged}
                ></ha-checkbox>
              </ha-formfield>
            `
          )}
        </div>
      `;
    }

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
          item-value-path="value"
          item-label-path="label"
          .hass=${this.hass}
          .label=${this.label}
          .disabled=${this.disabled}
          .value=${this._filter}
          .items=${options}
          @filter-changed=${this._filterChanged}
          @value-changed=${this._comboBoxValueChanged}
        ></ha-combo-box>
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

  private get _mode(): "list" | "dropdown" {
    return this.selector.select.mode || this.selector.select.options.length > 6
      ? "list"
      : "dropdown";
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

    // Trying to reset the value... Not working currently
    this._filter = "";
    this.comboBox.value = "";
    this.requestUpdate();

    const currentValue =
      !this.value || this.value === "" ? [] : (this.value as string[]);

    fireEvent(this, "value-changed", {
      value: [...currentValue, newValue],
    });
  }

  private _filterChanged(ev: CustomEvent): void {
    this._filter = ev.detail.value;

    const filteredItems = this.comboBox.items?.filter((item) => {
      const label = item.label || item.value;
      return label.toLowerCase().includes(this._filter?.toLowerCase());
    });

    if (this._filter !== "" && this.selector.select.custom_value) {
      filteredItems?.unshift({ label: this._filter, value: this._filter });
    }

    this.comboBox.filteredItems = filteredItems;
  }

  static styles = css`
    ha-select,
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
