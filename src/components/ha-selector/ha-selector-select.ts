import { mdiDragHorizontalVariant } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../../common/string/compare";
import type { SelectOption, SelectSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../chips/ha-chip-set";
import "../chips/ha-input-chip";
import "../ha-checkbox";
import "../ha-dropdown-item";
import "../ha-formfield";
import "../ha-generic-picker";
import "../ha-input-helper-text";
import "../ha-radio";
import "../ha-select";
import "../ha-select-box";
import "../ha-sortable";

@customElement("ha-selector-select")
export class HaSelectSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: SelectSelector;

  @property() public value?: string | string[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ attribute: false })
  public localizeValue?: (key: string) => string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  private _itemMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    this._move(oldIndex!, newIndex);
  }

  private _move(index: number, newIndex: number) {
    const value = this.value as string[];
    const newValue = value.concat();
    const element = newValue.splice(index, 1)[0];
    newValue.splice(newIndex, 0, element);
    this.value = newValue;
    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  protected render() {
    const options = this._getOptions(this.selector);

    const translationKey = this.selector.select?.translation_key;

    if (this.localizeValue && translationKey) {
      options.forEach((option) => {
        const localizedLabel = this.localizeValue!(
          `${translationKey}.options.${option.value}`
        );
        if (localizedLabel) {
          option.label = localizedLabel;
        }
      });
    }

    if (this.selector.select?.sort) {
      options.sort((a, b) =>
        caseInsensitiveStringCompare(
          a.label,
          b.label,
          this.hass.locale.language
        )
      );
    }

    if (
      !this.selector.select?.multiple &&
      !this.selector.select?.reorder &&
      !this.selector.select?.custom_value &&
      this._mode === "box"
    ) {
      return html`
        ${this.label ? html`<span class="label">${this.label}</span>` : nothing}
        <ha-select-box
          .options=${options}
          .value=${this.value as string | undefined}
          @value-changed=${this._valueChanged}
          .maxColumns=${this.selector.select?.box_max_columns}
          .hass=${this.hass}
        ></ha-select-box>
        ${this._renderHelper()}
      `;
    }

    if (
      !this.selector.select?.custom_value &&
      !this.selector.select?.reorder &&
      this._mode === "list"
    ) {
      if (!this.selector.select?.multiple) {
        return html`
          <div>
            ${this.label}
            ${options.map(
              (item: SelectOption) => html`
                <ha-formfield
                  .label=${item.label}
                  .disabled=${item.disabled || this.disabled}
                >
                  <ha-radio
                    .checked=${item.value === this.value}
                    .value=${item.value}
                    .disabled=${item.disabled || this.disabled}
                    @change=${this._valueChanged}
                  ></ha-radio>
                </ha-formfield>
              `
            )}
          </div>
          ${this._renderHelper()}
        `;
      }
      const value =
        !this.value || this.value === "" ? [] : ensureArray(this.value);
      return html`
        <div>
          ${this.label}
          ${options.map(
            (item: SelectOption) => html`
              <ha-formfield .label=${item.label}>
                <ha-checkbox
                  .checked=${value.includes(item.value)}
                  .value=${item.value}
                  .disabled=${item.disabled || this.disabled}
                  @change=${this._checkboxChanged}
                ></ha-checkbox>
              </ha-formfield>
            `
          )}
        </div>
        ${this._renderHelper()}
      `;
    }

    if (this.selector.select?.multiple) {
      const value =
        !this.value || this.value === "" ? [] : ensureArray(this.value);

      return html`
        ${value?.length
          ? html`
              <ha-sortable
                no-style
                .disabled=${!this.selector.select.reorder}
                @item-moved=${this._itemMoved}
                handle-selector="button.primary.action"
              >
                <ha-chip-set>
                  ${repeat(
                    value,
                    (item) => item,
                    (item, idx) => {
                      const label =
                        options.find((option) => option.value === item)
                          ?.label || item;
                      return html`
                        <ha-input-chip
                          .idx=${idx}
                          @remove=${this._removeItem}
                          .label=${label}
                          selected
                        >
                          ${this.selector.select?.reorder
                            ? html`
                                <ha-svg-icon
                                  slot="icon"
                                  .path=${mdiDragHorizontalVariant}
                                ></ha-svg-icon>
                              `
                            : nothing}
                          ${options.find((option) => option.value === item)
                            ?.label || item}
                        </ha-input-chip>
                      `;
                    }
                  )}
                </ha-chip-set>
              </ha-sortable>
            `
          : nothing}

        <ha-generic-picker
          .hass=${this.hass}
          .helper=${this.helper}
          .disabled=${this.disabled}
          .required=${this.required && !value.length}
          .value=${""}
          .addButtonLabel=${this.label}
          .getItems=${this._getItems(options, value, true)}
          .allowCustomValue=${this.selector.select.custom_value ?? false}
          @value-changed=${this._comboBoxValueChanged}
        ></ha-generic-picker>
      `;
    }

    if (this.selector.select?.custom_value) {
      return html`
        <ha-generic-picker
          .hass=${this.hass}
          .label=${this.label}
          .helper=${this.helper}
          .disabled=${this.disabled}
          .required=${this.required}
          .getItems=${this._getItems(options)}
          .value=${this.value as string | undefined}
          @value-changed=${this._comboBoxValueChanged}
          allow-custom-value
        ></ha-generic-picker>
      `;
    }

    return html`
      <ha-select
        .label=${this.label ?? ""}
        .value=${(this.value as string) ?? ""}
        .helper=${this.helper ?? ""}
        .disabled=${this.disabled}
        .required=${this.required}
        clearable
        @selected=${this._valueChanged}
        .options=${options}
      >
      </ha-select>
    `;
  }

  private _renderHelper() {
    return this.helper
      ? html`<ha-input-helper-text .disabled=${this.disabled}
          >${this.helper}</ha-input-helper-text
        >`
      : "";
  }

  private _getOptions = memoizeOne(
    (selector: SelectSelector) =>
      selector.select?.options?.map((option) =>
        typeof option === "object"
          ? (option as SelectOption)
          : ({ value: option, label: option } as SelectOption)
      ) || []
  );

  private _getItems = memoizeOne(
    (options: SelectOption[], value?: string[], multiple = false) => {
      const filteredOptions = options.filter((option) =>
        !option.disabled && !multiple ? true : !value?.includes(option.value)
      );

      return () =>
        filteredOptions.map((option) => ({
          id: option.value,
          primary: option.label,
          sorting_label: option.label,
        }));
    }
  );

  private get _mode(): "list" | "dropdown" | "box" {
    return (
      this.selector.select?.mode ||
      ((this.selector.select?.options?.length || 0) < 6 ? "list" : "dropdown")
    );
  }

  private _valueChanged(ev) {
    ev.stopPropagation();

    if (ev.detail?.value === undefined && this.value !== undefined) {
      fireEvent(this, "value-changed", {
        value: undefined,
      });
      return;
    }

    const value = ev.detail?.value || ev.target.value;
    if (this.disabled || value === undefined || value === (this.value ?? "")) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: value,
    });
  }

  private _checkboxChanged(ev) {
    ev.stopPropagation();
    if (this.disabled) {
      return;
    }

    let newValue: string[];
    const value: string = ev.target.value;
    const checked = ev.target.checked;

    const oldValue =
      !this.value || this.value === "" ? [] : ensureArray(this.value);

    if (checked) {
      if (oldValue.includes(value)) {
        return;
      }
      newValue = [...oldValue, value];
    } else {
      if (!oldValue?.includes(value)) {
        return;
      }
      newValue = oldValue.filter((v) => v !== value);
    }

    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  private async _removeItem(ev) {
    ev.stopPropagation();
    const value: string[] = [...ensureArray(this.value!)];
    value.splice(ev.target.idx, 1);

    fireEvent(this, "value-changed", {
      value,
    });
  }

  private _comboBoxValueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    const newValue = ev.detail.value;

    if (this.disabled || newValue === "") {
      return;
    }

    if (!this.selector.select?.multiple) {
      fireEvent(this, "value-changed", {
        value: newValue,
      });
      return;
    }

    const currentValue = !this.value ? [] : ensureArray(this.value);

    if (newValue !== undefined && currentValue.includes(newValue)) {
      return;
    }

    fireEvent(this, "value-changed", {
      value: [...currentValue, newValue],
    });
  }

  static styles = css`
    :host {
      position: relative;
    }
    ha-select,
    ha-formfield {
      display: block;
    }
    ha-dropdown-item[disabled] {
      --mdc-theme-text-primary-on-background: var(--disabled-text-color);
    }
    ha-chip-set {
      padding: 8px 0;
    }

    .label {
      display: block;
      margin: 0 0 8px;
    }

    ha-select-box + ha-input-helper-text {
      margin-top: 4px;
    }

    .sortable-fallback {
      display: none;
      opacity: 0;
    }

    .sortable-ghost {
      opacity: 0.4;
    }

    .sortable-drag {
      cursor: grabbing;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-select": HaSelectSelector;
  }
}
