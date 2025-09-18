import { mdiDrag } from "@mdi/js";
import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import type { EntityNameType } from "../../common/translations/entity-state";
import { computeEntityDisplayName } from "../../panels/lovelace/common/entity/compute-display-name";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../chips/ha-chip-set";
import "../chips/ha-filter-chip";
import "../chips/ha-input-chip";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";
import "../ha-list-item";
import "../ha-select";
import "../ha-sortable";
import "../ha-textfield";

const NAMES: EntityNameType[] = ["entity", "device", "area", "floor"];

interface EntityNameItem {
  primary: string;
  secondary?: string;
  value: string;
}

const rowRenderer: ComboBoxLitRenderer<EntityNameItem> = (item) => html`
  <ha-combo-box-item type="button">
    <span slot="headline">${item.primary}</span>
    ${item.secondary
      ? html`<span slot="supporting-text">${item.secondary}</span>`
      : nothing}
  </ha-combo-box-item>
`;

@customElement("ha-entity-name-picker")
export class HaEntityNamePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId?: string;

  @property() public value?: string[] | string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @state() private _opened = false;

  @query("ha-combo-box", true) private _comboBox!: HaComboBox;

  protected shouldUpdate(changedProps: PropertyValues) {
    return !(!changedProps.has("_opened") && this._opened);
  }

  protected updated(changedProps: PropertyValues) {
    if (
      (changedProps.has("_opened") && this._opened) ||
      changedProps.has("entityId")
    ) {
      const options = this._getItems(this.entityId);
      const optionItems = options.filter(
        (option) => !this._value.includes(option.value)
      );
      (this._comboBox as any).filteredItems = optionItems;
    }
  }

  private _getItems = memoizeOne((entityId?: string) => {
    if (!entityId) {
      return [];
    }
    if (!this.hass.states[entityId]) {
      return [];
    }
    const options = NAMES.map<EntityNameItem>((name) => ({
      primary: this.hass.localize(
        `ui.components.entity.entity-name-picker.types.${name}`
      ),
      secondary: computeEntityDisplayName(
        this.hass,
        this.hass.states[entityId],
        name
      ),
      value: name,
    }));
    return options;
  });

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const value = this._value;

    const options = this._getItems(this.entityId);
    const optionItems = options.filter(
      (option) => !this._value.includes(option.value)
    );

    return html`
      ${value?.length
        ? html`
            <ha-sortable
              no-style
              @item-moved=${this._moveItem}
              .disabled=${this.disabled}
              handle-selector="button.primary.action"
            >
              <ha-chip-set>
                ${repeat(
                  this._value,
                  (item) => item,
                  (item, idx) => {
                    const label =
                      options.find((option) => option.value === item)
                        ?.primary || item;
                    return html`
                      <ha-input-chip
                        data-idx=${idx}
                        @remove=${this._removeItem}
                        .label=${label}
                        selected
                      >
                        <ha-svg-icon slot="icon" .path=${mdiDrag}></ha-svg-icon>
                        ${label}
                      </ha-input-chip>
                    `;
                  }
                )}
              </ha-chip-set>
            </ha-sortable>
          `
        : nothing}

      <ha-combo-box
        hide-clear-icon
        .hass=${this.hass}
        .value=${""}
        .autofocus=${this.autofocus}
        .label=${this.label}
        .disabled=${this.disabled || !this.entityId}
        .required=${this.required && !value.length}
        .helper=${this.helper}
        .allowCustomValue=${true}
        item-id-path="value"
        item-value-path="value"
        item-label-path="primary"
        .renderer=${rowRenderer}
        .items=${optionItems}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._comboBoxValueChanged}
        @filter-changed=${this._filterChanged}
      >
      </ha-combo-box>
    `;
  }

  private get _value() {
    return !this.value ? [] : ensureArray(this.value);
  }

  private _openedChanged(ev: ValueChangedEvent<boolean>) {
    this._opened = ev.detail.value;
    if (this._opened) {
      const options = this._getItems(this.entityId);
      const optionItems = options.filter(
        (option) => !this._value.includes(option.value)
      );
      this._comboBox.filteredItems = optionItems;
    }
  }

  private _filterChanged(ev: ValueChangedEvent<string>) {
    const filter = ev.detail.value?.toLowerCase() || "";
    const options = this._getItems(this.entityId);
    const optionItems = options.filter(
      (option) => !this._value.includes(option.value)
    );

    const filteredItems = optionItems.filter((item) => {
      const label = item.primary || item.value;
      return label.toLowerCase().includes(filter);
    });

    if (filter) {
      filteredItems.unshift({
        primary: filter,
        value: filter,
        secondary: undefined,
      });
    }

    this._comboBox.filteredItems = filteredItems;
  }

  private async _moveItem(ev: CustomEvent) {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const value = this._value;
    const newValue = value.concat();
    const element = newValue.splice(oldIndex, 1)[0];
    newValue.splice(newIndex, 0, element);
    this._setValue(newValue);
    await this.updateComplete;
    this._filterChanged({ detail: { value: "" } } as ValueChangedEvent<string>);
  }

  private async _removeItem(ev) {
    ev.stopPropagation();
    const value: string[] = [...this._value];
    const idx = parseInt(ev.target.dataset.idx, 10);
    value.splice(idx, 1);
    this._setValue(value);
    await this.updateComplete;
    this._filterChanged({ detail: { value: "" } } as ValueChangedEvent<string>);
  }

  private _comboBoxValueChanged(ev: ValueChangedEvent<string>): void {
    ev.stopPropagation();
    const newValue = ev.detail.value;

    if (this.disabled || newValue === "") {
      return;
    }

    const currentValue = this._value;

    if (currentValue.includes(newValue)) {
      return;
    }

    setTimeout(() => {
      this._filterChanged({
        detail: { value: "" },
      } as ValueChangedEvent<string>);
      this._comboBox.setInputValue("");
    }, 0);

    this._setValue([...currentValue, newValue]);
  }

  private _setValue(value: string[]) {
    const newValue =
      value.length === 0 ? undefined : value.length === 1 ? value[0] : value;
    this.value = newValue;
    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  static styles = css`
    :host {
      position: relative;
    }

    ha-chip-set {
      padding: 8px 0;
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
    "ha-entity-name-picker": HaEntityNamePicker;
  }
}
