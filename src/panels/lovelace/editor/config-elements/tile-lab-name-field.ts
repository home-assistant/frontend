/* eslint-disable -- FOR TESTING ONLY: tile card editor concept comparison; not for merge */
import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { mdiDragHorizontalVariant, mdiPencilOutline, mdiPlus } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../../../common/array/ensure-array";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { EntityNameItem } from "../../../../common/entity/compute_entity_name_display";
import { computeStateName } from "../../../../common/entity/compute_state_name";
import { getEntityContext } from "../../../../common/entity/context/get_entity_context";
import type { LocalizeKeys } from "../../../../common/translations/localize";
import type { EntityNameType } from "../../../../common/translations/entity-state";
import "../../../../components/chips/ha-assist-chip";
import "../../../../components/chips/ha-chip-set";
import "../../../../components/chips/ha-input-chip";
import "../../../../components/ha-combo-box-item";
import "../../../../components/ha-generic-picker";
import type { HaGenericPicker } from "../../../../components/ha-generic-picker";
import type { PickerComboBoxItem } from "../../../../components/ha-picker-combo-box";
import "../../../../components/ha-sortable";
import "../../../../components/ha-svg-icon";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";

// Concept A's name field.
//
// HA's own ha-entity-name-picker offers a Composed/Custom toggle: "Custom"
// swaps the whole chip field for a plain text box, so a typed name and the
// composed parts are mutually exclusive and live in different UIs. This field
// merges them into one row of chips:
//
//   [ "Kitchen" ] [ Area ] [ Entity ]  ( ✎ Custom ) ( + Add )
//
// - "Custom" adds a text chip you type directly into (click an existing text
//   chip to edit it again).
// - "Add" adds a structured part (Entity / Device / Area / Floor) — no custom
//   text here, so there is exactly one way to add each kind of thing.
// - Chips drag to reorder, which is the order they appear in the name.

const PART_TYPES = ["entity", "device", "area", "floor"] as const;

const KNOWN_TYPES = new Set<string>(PART_TYPES);

// One of each structured part only; text parts may repeat.
const UNIQUE_TYPES = new Set<string>(PART_TYPES);

// Sentinel index meaning "the trailing new-text input is open".
const NEW_ITEM = -1;

const rowRenderer: RenderItemFunction<PickerComboBoxItem> = (item) => html`
  <ha-combo-box-item type="button" compact>
    <span slot="headline">${item.primary}</span>
    ${
      item.secondary
        ? html`<span slot="supporting-text">${item.secondary}</span>`
        : nothing
    }
  </ha-combo-box-item>
`;

const formatOptionValue = (item: EntityNameItem) =>
  item.type === "text" && item.text ? item.text : `___${item.type}___`;

const parseOptionValue = (value: string): EntityNameItem => {
  if (value.startsWith("___") && value.endsWith("___")) {
    const type = value.slice(3, -3);
    if (KNOWN_TYPES.has(type)) {
      return { type: type as EntityNameType };
    }
  }
  return { type: "text", text: value };
};

@customElement("tile-lab-name-field")
export class TileLabNameField extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId?: string;

  @property({ attribute: false }) public value?:
    string | EntityNameItem | EntityNameItem[];

  // Index of the text chip being edited inline, or NEW_ITEM for the trailing
  // new-text input. undefined = nothing being edited.
  @state() private _editIndex?: number;

  @state() private _draft = "";

  @query("ha-generic-picker") private _picker?: HaGenericPicker;

  @query(".chip-edit input") private _editInput?: HTMLInputElement;

  // Index the dropdown is currently changing (undefined = adding a new part).
  private _pickerIndex?: number;

  // ---- value plumbing -------------------------------------------------------

  private _toItems = memoizeOne((value?: typeof this.value) => {
    if (typeof value === "string") {
      return value === "" ? [] : [{ type: "text", text: value } as const];
    }
    return value ? (ensureArray(value) as EntityNameItem[]) : [];
  });

  private get _items(): EntityNameItem[] {
    return this._toItems(this.value) as EntityNameItem[];
  }

  // With no name set, the tile shows the entity's own name. Surface that as a
  // muted "automatic" chip so the field shows the name actually on the card,
  // and it's clear it is inherited rather than typed. Clicking it starts an
  // edit pre-filled with that name, which then becomes a real custom chip.
  private get _inheritedName(): string | undefined {
    if (this._items.length || !this.entityId) {
      return undefined;
    }
    const stateObj = this.hass.states[this.entityId];
    return stateObj ? computeStateName(stateObj) : undefined;
  }

  private _editInherited(ev: Event): void {
    ev.stopPropagation();
    this._editIndex = NEW_ITEM;
    this._draft = this._inheritedName ?? "";
  }

  // Collapse back to the simplest shape HA accepts, matching its own picker:
  // nothing, a bare string, a single part, or a list.
  private _emit(items: EntityNameItem[]): void {
    let value: typeof this.value;
    if (items.length === 0) {
      value = undefined;
    } else if (items.length === 1) {
      const item = items[0];
      value = item.type === "text" ? item.text : item;
    } else {
      value = items;
    }
    this.value = value;
    fireEvent(this, "value-changed", { value });
  }

  // ---- inline text editing --------------------------------------------------

  private _startCustom(ev: Event): void {
    ev.stopPropagation();
    this._editIndex = NEW_ITEM;
    this._draft = "";
  }

  private _chipClicked(ev: Event): void {
    ev.stopPropagation();
    const idx = parseInt(
      (ev.currentTarget as HTMLElement).dataset.idx || "",
      10
    );
    const item = this._items[idx];
    if (!item) {
      return;
    }
    if (item.type === "text") {
      // Editing a text chip happens in place.
      this._editIndex = idx;
      this._draft = item.text;
      return;
    }
    // Structured parts are swapped through the dropdown.
    this._openPicker(idx);
  }

  private _draftChanged(ev: Event): void {
    this._draft = (ev.target as HTMLInputElement).value;
  }

  private _draftKeydown(ev: KeyboardEvent): void {
    if (ev.key === "Enter") {
      ev.preventDefault();
      this._commitDraft();
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      this._cancelDraft();
    }
  }

  private _commitDraft(): void {
    const index = this._editIndex;
    if (index == null) {
      // Enter already committed and removed the input; ignore the blur that
      // follows, so we don't emit the same config twice.
      return;
    }
    const text = this._draft.trim();
    const items = [...this._items];

    this._editIndex = undefined;
    this._draft = "";

    if (index === NEW_ITEM) {
      if (!text) {
        return; // nothing typed — no empty chip
      }
      items.push({ type: "text", text });
    } else if (index != null) {
      if (text) {
        items[index] = { type: "text", text };
      } else {
        items.splice(index, 1); // cleared = remove the chip
      }
    }
    this._emit(items);
  }

  private _cancelDraft(): void {
    this._editIndex = undefined;
    this._draft = "";
  }

  protected updated(): void {
    // Focus the inline input as soon as it appears.
    if (this._editIndex != null && this._editInput) {
      if (this.shadowRoot?.activeElement !== this._editInput) {
        this._editInput.focus();
        this._editInput.select();
      }
    }
  }

  // ---- structured parts (dropdown) -----------------------------------------

  private async _openPicker(index?: number): Promise<void> {
    this._pickerIndex = index;
    await this.updateComplete;
    await this._picker?.open();
  }

  private _addPart(ev: Event): void {
    ev.stopPropagation();
    this._openPicker(undefined);
  }

  private _pickerValueChanged(ev: ValueChangedEvent<string>): void {
    ev.stopPropagation();
    const value = ev.detail.value;
    if (!value) {
      return;
    }
    const item = parseOptionValue(value);
    const items = [...this._items];
    if (this._pickerIndex != null) {
      items[this._pickerIndex] = item;
      this._pickerIndex = undefined;
    } else {
      items.push(item);
    }
    this._emit(items);
    if (this._picker) {
      this._picker.value = undefined;
    }
  }

  // ---- chip list ------------------------------------------------------------

  private _removeItem(ev: Event): void {
    ev.stopPropagation();
    const idx = parseInt((ev.target as HTMLElement).dataset.idx || "", 10);
    const items = [...this._items];
    items.splice(idx, 1);
    this._emit(items);
  }

  private _moveItem(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const items = [...this._items];
    const moved = items.splice(oldIndex, 1)[0];
    items.splice(newIndex, 0, moved);
    this._emit(items);
  }

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
    return PART_TYPES.map<PickerComboBoxItem>((name) => {
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
        search_labels: { primary, secondary: secondary || null, id },
        sorting_label: primary,
      };
    });
  });

  // Only offer parts not already used (except the one being changed).
  private _getFilteredItems = (): PickerComboBoxItem[] => {
    const items = this._getItems(this.entityId);
    const current =
      this._pickerIndex != null ? this._items[this._pickerIndex] : undefined;
    const currentValue = current ? formatOptionValue(current) : "";
    const used = new Set(
      this._items
        .filter((item) => UNIQUE_TYPES.has(item.type))
        .map((item) => formatOptionValue(item))
    );
    return items.filter(
      (item) => !used.has(item.id) || item.id === currentValue
    );
  };

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

  private _renderEditor() {
    return html`
      <div class="chip-edit">
        <input
          .value=${this._draft}
          placeholder="Custom text"
          @input=${this._draftChanged}
          @keydown=${this._draftKeydown}
          @blur=${this._commitDraft}
        />
      </div>
    `;
  }

  private _renderChip(item: EntityNameItem, idx: number, valid: Set<string>) {
    const label = this._formatItem(item);
    return html`
      <ha-input-chip
        data-idx=${idx}
        @remove=${this._removeItem}
        @click=${this._chipClicked}
        .label=${label}
        selected
        class=${valid.has(item.type) ? "" : "invalid"}
      >
        <ha-svg-icon
          slot="icon"
          .path=${mdiDragHorizontalVariant}
        ></ha-svg-icon>
        <span>${label}</span>
      </ha-input-chip>
    `;
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }
    const items = this._items;
    const valid = this._validTypes(this.entityId);
    const inherited = this._inheritedName;

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .getItems=${this._getFilteredItems}
        .rowRenderer=${rowRenderer}
        @value-changed=${this._pickerValueChanged}
        .searchLabel=${this.hass.localize(
          "ui.components.entity.entity-name-picker.search"
        )}
      >
        <div slot="field" class="field">
          <ha-sortable
            no-style
            @item-moved=${this._moveItem}
            handle-selector="button.primary.action"
            filter=".add,.custom,.chip-edit"
          >
            <ha-chip-set>
              ${repeat(
                items,
                (item) => item,
                (item: EntityNameItem, idx) =>
                  this._editIndex === idx
                    ? this._renderEditor()
                    : this._renderChip(item, idx, valid)
              )}
              ${this._editIndex === NEW_ITEM ? this._renderEditor() : nothing}
              ${
                inherited && this._editIndex == null
                  ? html`<ha-assist-chip
                      class="inherited"
                      .label=${inherited}
                      title="Using the entity's own name — click to replace it"
                      @click=${this._editInherited}
                    ></ha-assist-chip>`
                  : nothing
              }
              <ha-assist-chip
                class="custom"
                label="Custom"
                @click=${this._startCustom}
              >
                <ha-svg-icon
                  slot="icon"
                  .path=${mdiPencilOutline}
                ></ha-svg-icon>
              </ha-assist-chip>
              <ha-assist-chip
                class="add"
                label=${this.hass.localize(
                  "ui.components.entity.entity-name-picker.add"
                )}
                @click=${this._addPart}
              >
                <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
              </ha-assist-chip>
            </ha-chip-set>
          </ha-sortable>
        </div>
      </ha-generic-picker>
    `;
  }

  static styles = css`
    :host {
      position: relative;
      width: 100%;
      display: block;
    }
    ha-generic-picker {
      width: 100%;
    }
    /* Field surface — matches HA's own name picker so it reads as one input. */
    .field {
      position: relative;
      background-color: var(--mdc-text-field-fill-color, whitesmoke);
      border-radius: var(--ha-border-radius-sm);
      border-end-end-radius: var(--ha-border-radius-square);
      border-end-start-radius: var(--ha-border-radius-square);
    }
    .field:after {
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
    }
    .field:focus-within:after {
      height: 2px;
      background-color: var(--mdc-theme-primary);
    }
    ha-chip-set {
      padding: var(--ha-space-3);
    }
    /* Inherited name reads as automatic, not as something you typed. */
    .inherited {
      --md-assist-chip-label-text-color: var(--secondary-text-color);
      --md-assist-chip-outline-color: var(--divider-color, #e0e0e0);
      font-style: italic;
    }
    /* Keep the action chips at the end of the row, Custom before Add. */
    .inherited {
      order: 0;
    }
    .custom {
      order: 1;
    }
    .add {
      order: 2;
    }
    .invalid {
      text-decoration: line-through;
    }
    /* Inline editor, sized to sit in the chip row like a chip. */
    .chip-edit {
      display: inline-flex;
      align-items: center;
      height: 32px;
      padding: 0 var(--ha-space-3, 12px);
      border: 1px solid var(--primary-color);
      border-radius: var(--ha-border-radius-sm, 8px);
      background: var(--card-background-color, #fff);
      box-sizing: border-box;
    }
    .chip-edit input {
      appearance: none;
      background: none;
      border: 0;
      outline: none;
      color: var(--primary-text-color);
      font-family: inherit;
      font-size: var(--ha-font-size-m, 14px);
      min-width: 96px;
      width: 12ch;
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
    "tile-lab-name-field": TileLabNameField;
  }
}
