import "@material/mwc-menu/mwc-menu-surface";
import { mdiDrag, mdiPlus } from "@mdi/js";
import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import { getEntityContext } from "../../common/entity/context/get_entity_context";
import {
  computeEntityDisplayName,
  ENTITY_DISPLAY_NAME_TYPES,
  type EntityDisplayNameType,
} from "../../panels/lovelace/common/entity/compute-display-name";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../chips/ha-assist-chip";
import "../chips/ha-chip-set";
import "../chips/ha-filter-chip";
import "../chips/ha-input-chip";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";
import "../ha-list-item";
import "../ha-select";
import "../ha-sortable";
import "../ha-textfield";

interface EntityNameOption {
  primary: string;
  secondary?: string;
  value: string;
}

const rowRenderer: ComboBoxLitRenderer<EntityNameOption> = (item) => html`
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

  @query(".container", true) private _container?: HTMLDivElement;

  @query("ha-combo-box", true) private _comboBox!: HaComboBox;

  @state() private _opened = false;

  private _editIndex?: number;

  private _validOptions = memoizeOne((entityId: string) => {
    const stateObj = this.hass.states[entityId];
    if (!stateObj) {
      return [];
    }

    const context = getEntityContext(
      stateObj,
      this.hass.entities,
      this.hass.devices,
      this.hass.areas,
      this.hass.floors
    );
    const options: EntityDisplayNameType[] = ["entity_name"];
    if (context.device) options.push("device_name");
    if (context.area) options.push("area_name");
    if (context.floor) options.push("floor_name");
    return options;
  });

  private _getOptions = memoizeOne((entityId?: string) => {
    if (!entityId) {
      return [];
    }

    const items = this._validOptions(entityId).map<EntityNameOption>(
      (name) => ({
        primary: this.hass.localize(
          `ui.components.entity.entity-name-picker.types.${name}`
        ),
        secondary: computeEntityDisplayName(
          this.hass,
          this.hass.states[entityId],
          name
        ),
        value: name,
      })
    );
    return items;
  });

  protected render() {
    if (!this.hass) {
      return nothing;
    }

    const value = this._value;
    const options = this._getOptions(this.entityId);

    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <div class="container">
        <ha-sortable
          no-style
          @item-moved=${this._moveItem}
          .disabled=${this.disabled}
          handle-selector="button.primary.action"
          filter=".add"
        >
          <ha-chip-set>
            ${repeat(
              this._value,
              (item) => item,
              (item, idx) => {
                const label = ENTITY_DISPLAY_NAME_TYPES.includes(item)
                  ? this.hass.localize(
                      `ui.components.entity.entity-name-picker.types.${item as EntityDisplayNameType}`
                    )
                  : `"${item}"`;
                return html`
                  <ha-input-chip
                    data-idx=${idx}
                    @remove=${this._removeItem}
                    @click=${this._editItem}
                    .label=${label}
                    .selected=${!this.disabled}
                    .disabled=${this.disabled}
                  >
                    <ha-svg-icon slot="icon" .path=${mdiDrag}></ha-svg-icon>
                    <span>${label}</span>
                  </ha-input-chip>
                `;
              }
            )}
            ${this.disabled
              ? nothing
              : html`
                  <ha-assist-chip
                    @click=${this._addItem}
                    .disabled=${this.disabled}
                    label=${this.hass.localize(
                      "ui.components.entity.entity-name-picker.add"
                    )}
                    class="add"
                  >
                    <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
                  </ha-assist-chip>
                `}
          </ha-chip-set>
        </ha-sortable>

        <mwc-menu-surface
          .open=${this._opened}
          @closed=${this._onClosed}
          @opened=${this._onOpened}
          @input=${stopPropagation}
          .anchor=${this._container}
        >
          <ha-combo-box
            .hass=${this.hass}
            .value=${""}
            .autofocus=${this.autofocus}
            .disabled=${this.disabled || !this.entityId}
            .required=${this.required && !value.length}
            .helper=${this.helper}
            .items=${options}
            allow-custom-value
            item-id-path="value"
            item-value-path="value"
            item-label-path="primary"
            .renderer=${rowRenderer}
            @opened-changed=${this._openedChanged}
            @value-changed=${this._comboBoxValueChanged}
            @filter-changed=${this._filterChanged}
          >
          </ha-combo-box>
        </mwc-menu-surface>
      </div>
    `;
  }

  private _onClosed(ev) {
    ev.stopPropagation();
    this._opened = false;
    this._editIndex = undefined;
  }

  private async _onOpened(ev) {
    if (!this._opened) {
      return;
    }
    ev.stopPropagation();
    this._opened = true;
    await this._comboBox?.focus();
    await this._comboBox?.open();
  }

  private async _addItem(ev) {
    ev.stopPropagation();
    this._opened = true;
  }

  private async _editItem(ev) {
    ev.stopPropagation();
    const idx = parseInt(ev.currentTarget.dataset.idx, 10);
    this._editIndex = idx;
    this._opened = true;
  }

  private get _value() {
    return this.value ? ensureArray(this.value) : [];
  }

  private _openedChanged(ev: ValueChangedEvent<boolean>) {
    const open = ev.detail.value;
    if (open) {
      const options = this._comboBox.items || [];

      const initialValue =
        this._editIndex != null ? this._value[this._editIndex] : "";

      this._comboBox.filteredItems = this._filterSelectedOptions(
        options,
        initialValue
      );
      this._comboBox.setInputValue(initialValue);
    } else {
      this._opened = false;
    }
  }

  private _filterSelectedOptions = (
    options: EntityNameOption[],
    current?: string
  ) => {
    const value = this._value;
    return options.filter(
      (option) => !value.includes(option.value) || option.value === current
    );
  };

  private _filterChanged(ev: ValueChangedEvent<string>) {
    const input = ev.detail.value;
    const filter = input?.toLowerCase() || "";
    const options = this._comboBox.items || [];

    const currentValue =
      this._editIndex != null ? this._value[this._editIndex] : "";
    this._comboBox.filteredItems = this._filterSelectedOptions(
      options,
      currentValue
    );

    if (!filter) {
      return;
    }

    const fuseOptions: IFuseOptions<EntityNameOption> = {
      keys: ["primary", "secondary", "value"],
      isCaseSensitive: false,
      minMatchCharLength: Math.min(filter.length, 2),
      threshold: 0.2,
      ignoreDiacritics: true,
    };

    const fuse = new Fuse(this._comboBox.filteredItems, fuseOptions);
    const filteredItems = fuse.search(filter).map((result) => result.item);

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
    const value = ev.detail.value;

    if (this.disabled || value === "") {
      return;
    }

    const currentValue = [...this._value];

    const newValue = [...currentValue];

    if (this._editIndex != null) {
      newValue[this._editIndex] = value;
    } else {
      newValue.push(value);
    }

    this._setValue(newValue);
  }

  private _setValue(value: string[]) {
    const newValue =
      value.length === 0 ? [] : value.length === 1 ? value[0] : value;
    this.value = newValue;
    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }

  static styles = css`
    :host {
      position: relative;
      width: 100%;
    }

    .container {
      position: relative;
      background-color: var(--mdc-text-field-fill-color, whitesmoke);
      border-radius: 4px;
      border-end-end-radius: 0;
      border-end-start-radius: 0;
    }
    .container:after {
      display: block;
      content: "";
      position: absolute;
      pointer-events: none;
      bottom: 0;
      left: 0;
      right: 0;
      height: 1px;
      width: 100%;
      background-color: var(
        --mdc-text-field-idle-line-color,
        rgba(0, 0, 0, 0.42)
      );
      transform:
        height 180ms ease-in-out,
        background-color 180ms ease-in-out;
    }
    :host([disabled]) .container:after {
      background-color: var(
        --mdc-text-field-disabled-line-color,
        rgba(0, 0, 0, 0.42)
      );
    }
    .container:focus-within:after {
      height: 2px;
      background-color: var(--mdc-theme-primary);
    }

    label {
      display: block;
      margin: 0 0 8px;
    }

    .add {
      order: 1;
    }

    mwc-menu-surface {
      --mdc-menu-min-width: 100%;
    }

    ha-chip-set {
      padding: 8px 8px;
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
