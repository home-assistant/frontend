import "@material/mwc-menu/mwc-menu-surface";
import { mdiDrag, mdiPlus } from "@mdi/js";
import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { IFuseOptions } from "fuse.js";
import Fuse from "fuse.js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import type { EntityNameItem } from "../../common/entity/compute_entity_name_display";
import { getEntityContext } from "../../common/entity/context/get_entity_context";
import type { EntityNameType } from "../../common/translations/entity-state";
import type { LocalizeKeys } from "../../common/translations/localize";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../chips/ha-assist-chip";
import "../chips/ha-chip-set";
import "../chips/ha-input-chip";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";
import "../ha-sortable";

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

const KNOWN_TYPES = new Set(["entity", "device", "area", "floor"]);

const UNIQUE_TYPES = new Set(["entity", "device", "area", "floor"]);

@customElement("ha-entity-name-picker")
export class HaEntityNamePicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId?: string;

  @property({ attribute: false }) public value?:
    | string
    | EntityNameItem
    | EntityNameItem[];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public required = false;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @query(".container", true) private _container?: HTMLDivElement;

  @query("ha-combo-box", true) private _comboBox!: HaComboBox;

  @state() private _opened = false;

  private _editIndex?: number;

  private _validOptions = memoizeOne((entityId?: string) => {
    const options = new Set<string>();
    if (!entityId) {
      return options;
    }

    const stateObj = this.hass.states[entityId];

    if (!stateObj) {
      return options;
    }

    options.add("entity");

    const context = getEntityContext(
      stateObj,
      this.hass.entities,
      this.hass.devices,
      this.hass.areas,
      this.hass.floors
    );

    if (context.device) options.add("device");
    if (context.area) options.add("area");
    if (context.floor) options.add("floor");
    return options;
  });

  private _getOptions = memoizeOne((entityId?: string) => {
    if (!entityId) {
      return [];
    }

    const options = this._validOptions(entityId);

    const items = (
      ["entity", "device", "area", "floor"] as const
    ).map<EntityNameOption>((name) => {
      const stateObj = this.hass.states[entityId];
      const isValid = options.has(name);
      const primary = this.hass.localize(
        `ui.components.entity.entity-name-picker.types.${name}`
      );
      const secondary =
        stateObj && isValid
          ? this.hass.formatEntityName(stateObj, { type: name })
          : this.hass.localize(
              `ui.components.entity.entity-name-picker.types.${name}_missing` as LocalizeKeys
            ) || "-";

      return {
        primary,
        secondary,
        value: name,
      };
    });

    return items;
  });

  private _formatItem = (item: EntityNameItem) => {
    if (item.type === "text") {
      return `"${item.text}"`;
    }
    if (KNOWN_TYPES.has(item.type)) {
      return this.hass.localize(
        `ui.components.entity.entity-name-picker.types.${item.type as EntityNameType}`
      );
    }
    return item.type;
  };

  protected render() {
    const value = this._value;
    const options = this._getOptions(this.entityId);
    const validOptions = this._validOptions(this.entityId);

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
              (item: EntityNameItem, idx) => {
                const label = this._formatItem(item);
                const isValid =
                  item.type === "text" || validOptions.has(item.type);
                return html`
                  <ha-input-chip
                    data-idx=${idx}
                    @remove=${this._removeItem}
                    @click=${this._editItem}
                    .label=${label}
                    .selected=${!this.disabled}
                    .disabled=${this.disabled}
                    class=${classMap({ invalid: !isValid })}
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

  private get _value(): EntityNameItem[] {
    return this._toItems(this.value);
  }

  private _toItems = memoizeOne((value?: typeof this.value) => {
    if (typeof value === "string") {
      return [{ type: "text", text: value } as const];
    }
    return value ? ensureArray(value) : [];
  });

  private _toValue = memoizeOne(
    (items: EntityNameItem[]): typeof this.value => {
      if (items.length === 0) {
        return [];
      }
      if (items.length === 1) {
        const item = items[0];
        return item.type === "text" ? item.text : item;
      }
      return items;
    }
  );

  private _openedChanged(ev: ValueChangedEvent<boolean>) {
    const open = ev.detail.value;
    if (open) {
      const options = this._comboBox.items || [];

      const initialItem =
        this._editIndex != null ? this._value[this._editIndex] : undefined;

      const initialValue = initialItem
        ? initialItem.type === "text"
          ? initialItem.text
          : initialItem.type
        : "";

      const filteredItems = this._filterSelectedOptions(options, initialValue);

      this._comboBox.filteredItems = filteredItems;
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

    const types = value.map((item) => item.type) as string[];

    const filteredOptions = options.filter(
      (option) =>
        !UNIQUE_TYPES.has(option.value) ||
        !types.includes(option.value) ||
        option.value === current
    );
    return filteredOptions;
  };

  private _filterChanged(ev: ValueChangedEvent<string>) {
    const input = ev.detail.value;
    const filter = input?.toLowerCase() || "";
    const options = this._comboBox.items || [];

    const currentItem =
      this._editIndex != null ? this._value[this._editIndex] : undefined;

    const currentValue = currentItem
      ? currentItem.type === "text"
        ? currentItem.text
        : currentItem.type
      : "";

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
    const value = [...this._value];
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

    const item: EntityNameItem = KNOWN_TYPES.has(value as any)
      ? { type: value as EntityNameType }
      : { type: "text", text: value };

    const newValue = [...this._value];

    if (this._editIndex != null) {
      newValue[this._editIndex] = item;
    } else {
      newValue.push(item);
    }

    this._setValue(newValue);
  }

  private _setValue(value: EntityNameItem[]) {
    const newValue = this._toValue(value);
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
      border-radius: var(--ha-border-radius-sm);
      border-end-end-radius: var(--ha-border-radius-square);
      border-end-start-radius: var(--ha-border-radius-square);
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
      margin: 0 0 var(--ha-space-2);
    }

    .add {
      order: 1;
    }

    mwc-menu-surface {
      --mdc-menu-min-width: 100%;
    }

    ha-chip-set {
      padding: var(--ha-space-2) var(--ha-space-2);
    }

    .invalid {
      text-decoration: line-through;
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
