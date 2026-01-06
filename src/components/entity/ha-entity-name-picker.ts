import { mdiDragHorizontalVariant, mdiPlus } from "@mdi/js";
import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import type { EntityNameItem } from "../../common/entity/compute_entity_name_display";
import { getEntityContext } from "../../common/entity/context/get_entity_context";
import type { EntityNameType } from "../../common/translations/entity-state";
import type { LocalizeKeys } from "../../common/translations/localize";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../chips/ha-assist-chip";
import "../chips/ha-chip-set";
import "../chips/ha-input-chip";
import "../ha-combo-box-item";
import "../ha-generic-picker";
import type { HaGenericPicker } from "../ha-generic-picker";
import "../ha-input-helper-text";
import type { PickerComboBoxItem } from "../ha-picker-combo-box";
import "../ha-sortable";

const rowRenderer: RenderItemFunction<PickerComboBoxItem> = (item) => html`
  <ha-combo-box-item type="button" compact>
    <span slot="headline">${item.primary}</span>
    ${item.secondary
      ? html`<span slot="supporting-text">${item.secondary}</span>`
      : nothing}
  </ha-combo-box-item>
`;

const KNOWN_TYPES = new Set(["entity", "device", "area", "floor"]);

const UNIQUE_TYPES = new Set(["entity", "device", "area", "floor"]);

const formatOptionValue = (item: EntityNameItem) => {
  if (item.type === "text" && item.text) {
    return item.text;
  }
  return `___${item.type}___`;
};

const parseOptionValue = (value: string): EntityNameItem => {
  if (value.startsWith("___") && value.endsWith("___")) {
    const type = value.slice(3, -3);
    if (KNOWN_TYPES.has(type)) {
      return { type: type as EntityNameType };
    }
  }
  return { type: "text", text: value };
};

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

  @query("ha-generic-picker", true) private _picker?: HaGenericPicker;

  private _editIndex?: number;

  private _validTypes = memoizeOne((entityId?: string) => {
    const options = new Set<string>(["text"]);
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

  private _getItems = memoizeOne((entityId?: string) => {
    if (!entityId) {
      return [];
    }

    const types = this._validTypes(entityId);

    const items = (
      ["entity", "device", "area", "floor"] as const
    ).map<PickerComboBoxItem>((name) => {
      const stateObj = this.hass.states[entityId];
      const isValid = types.has(name);
      const primary = this.hass.localize(
        `ui.components.entity.entity-name-picker.types.${name}`
      );
      const secondary =
        (stateObj && isValid
          ? this.hass.formatEntityName(stateObj, { type: name })
          : this.hass.localize(
              `ui.components.entity.entity-name-picker.types.${name}_missing` as LocalizeKeys
            )) || "-";

      const id = formatOptionValue({ type: name });

      return {
        id,
        primary,
        secondary,
        search_labels: {
          primary,
          secondary: secondary || null,
          id,
        },
        sorting_label: primary,
      };
    });

    return items;
  });

  private _customNameOption = memoizeOne(
    (text: string): PickerComboBoxItem => ({
      id: formatOptionValue({ type: "text", text }),
      primary: this.hass.localize(
        "ui.components.entity.entity-name-picker.custom_name"
      ),
      secondary: `"${text}"`,
      search_labels: {
        primary: text,
        secondary: `"${text}"`,
        id: formatOptionValue({ type: "text", text }),
      },
      sorting_label: text,
    })
  );

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
    const value = this._items;
    const validTypes = this._validTypes(this.entityId);

    return html`
      ${this.label ? html`<label>${this.label}</label>` : nothing}
      <ha-generic-picker
        .hass=${this.hass}
        .disabled=${this.disabled}
        .required=${this.required && !value.length}
        .getItems=${this._getFilteredItems}
        .rowRenderer=${rowRenderer}
        .value=${this._getPickerValue()}
        allow-custom-value
        .customValueLabel=${this.hass.localize(
          "ui.components.entity.entity-name-picker.custom_name"
        )}
        @value-changed=${this._pickerValueChanged}
        .searchFn=${this._searchFn}
        .searchLabel=${this.hass.localize(
          "ui.components.entity.entity-name-picker.search"
        )}
      >
        <div slot="field" class="container">
          <ha-sortable
            no-style
            @item-moved=${this._moveItem}
            .disabled=${this.disabled}
            handle-selector="button.primary.action"
            filter=".add"
          >
            <ha-chip-set>
              ${repeat(
                this._items,
                (item) => item,
                (item: EntityNameItem, idx) => {
                  const label = this._formatItem(item);
                  const isValid = validTypes.has(item.type);
                  return html`
                    <ha-input-chip
                      data-idx=${idx}
                      @remove=${this._removeItem}
                      @click=${this._editItem}
                      .label=${label}
                      .selected=${!this.disabled}
                      .disabled=${this.disabled}
                      class=${!isValid ? "invalid" : ""}
                    >
                      <ha-svg-icon
                        slot="icon"
                        .path=${mdiDragHorizontalVariant}
                      ></ha-svg-icon>
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
        </div>
      </ha-generic-picker>
      ${this._renderHelper()}
    `;
  }

  private _renderHelper() {
    return this.helper
      ? html`
          <ha-input-helper-text .disabled=${this.disabled}>
            ${this.helper}
          </ha-input-helper-text>
        `
      : nothing;
  }

  private async _addItem(ev: Event) {
    ev.stopPropagation();
    this._editIndex = undefined;
    await this.updateComplete;
    await this._picker?.open();
  }

  private async _editItem(ev: Event) {
    ev.stopPropagation();
    const idx = parseInt(
      (ev.currentTarget as HTMLElement).dataset.idx || "",
      10
    );
    this._editIndex = idx;
    await this.updateComplete;
    await this._picker?.open();
  }

  private get _items(): EntityNameItem[] {
    return this._toItems(this.value);
  }

  private _toItems = memoizeOne((value?: typeof this.value) => {
    if (typeof value === "string") {
      if (value === "") {
        return [];
      }
      return [{ type: "text", text: value } satisfies EntityNameItem];
    }
    return value ? ensureArray(value) : [];
  });

  private _toValue = memoizeOne(
    (items: EntityNameItem[]): typeof this.value => {
      if (items.length === 0) {
        return undefined;
      }
      if (items.length === 1) {
        const item = items[0];
        return item.type === "text" ? item.text : item;
      }
      return items;
    }
  );

  private _getPickerValue(): string | undefined {
    if (this._editIndex != null) {
      const item = this._items[this._editIndex];
      return item ? formatOptionValue(item) : undefined;
    }
    return undefined;
  }

  private _getFilteredItems = (): PickerComboBoxItem[] => {
    const items = this._getItems(this.entityId);
    const currentItem =
      this._editIndex != null ? this._items[this._editIndex] : undefined;
    const currentValue = currentItem ? formatOptionValue(currentItem) : "";

    const excludedValues = new Set(
      this._items
        .filter((item) => UNIQUE_TYPES.has(item.type))
        .map((item) => formatOptionValue(item))
    );

    const filteredItems = items.filter(
      (item) => !excludedValues.has(item.id) || item.id === currentValue
    );

    // When editing an existing text item, include it in the base items
    if (currentItem?.type === "text" && currentItem.text) {
      filteredItems.push(this._customNameOption(currentItem.text));
    }

    return filteredItems;
  };

  private _searchFn = (
    searchString: string,
    filteredItems: PickerComboBoxItem[]
  ): PickerComboBoxItem[] => {
    const currentItem =
      this._editIndex != null ? this._items[this._editIndex] : undefined;
    const currentId =
      currentItem?.type === "text" && currentItem.text
        ? this._customNameOption(currentItem.text).id
        : undefined;

    // Remove custom name option if search string is present to avoid duplicates
    if (searchString && currentId) {
      return filteredItems.filter((item) => item.id !== currentId);
    }
    return filteredItems;
  };

  private async _moveItem(ev: CustomEvent) {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const value = this._items;
    const newValue = value.concat();
    const element = newValue.splice(oldIndex, 1)[0];
    newValue.splice(newIndex, 0, element);
    this._setValue(newValue);
  }

  private async _removeItem(ev: Event) {
    ev.stopPropagation();
    const value = [...this._items];
    const idx = parseInt((ev.target as HTMLElement).dataset.idx || "", 10);
    value.splice(idx, 1);
    this._setValue(value);
  }

  private _pickerValueChanged(ev: ValueChangedEvent<string>): void {
    ev.stopPropagation();
    const value = ev.detail.value;

    if (this.disabled || !value) {
      return;
    }

    const item: EntityNameItem = parseOptionValue(value);

    const newValue = [...this._items];

    if (this._editIndex != null) {
      newValue[this._editIndex] = item;
      this._editIndex = undefined;
    } else {
      newValue.push(item);
    }

    this._setValue(newValue);

    if (this._picker) {
      this._picker.value = undefined;
    }
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

    ha-input-helper-text {
      display: block;
      margin: var(--ha-space-2) 0 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-name-picker": HaEntityNamePicker;
  }
}
