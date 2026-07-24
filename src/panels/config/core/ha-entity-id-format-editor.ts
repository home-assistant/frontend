import type { RenderItemFunction } from "@lit-labs/virtualizer/virtualize";
import { mdiDragHorizontalVariant, mdiPlus } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/chips/ha-assist-chip";
import "../../../components/chips/ha-chip-set";
import "../../../components/chips/ha-input-chip";
import "../../../components/ha-combo-box-item";
import "../../../components/ha-generic-picker";
import type { HaGenericPicker } from "../../../components/ha-generic-picker";
import type { PickerComboBoxItem } from "../../../components/ha-picker-combo-box";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import type {
  EntityIdFormat,
  EntityIdPart,
} from "../../../data/entity_id_format";
import type { ValueChangedEvent } from "../../../types";

const STRUCTURAL_TYPES = ["area", "device", "entity", "floor"] as const;

const REQUIRED_TYPES: readonly EntityIdPart[] = ["device", "entity"];

const rowRenderer: RenderItemFunction<PickerComboBoxItem> = (item) => html`
  <ha-combo-box-item type="button" compact>
    <span slot="headline">${item.primary}</span>
  </ha-combo-box-item>
`;

const encodeType = (type: EntityIdPart) => `___${type}___`;

const decodeType = (value: string): EntityIdPart | undefined => {
  const type =
    value.startsWith("___") && value.endsWith("___")
      ? value.slice(3, -3)
      : value;
  return (STRUCTURAL_TYPES as readonly string[]).includes(type)
    ? (type as EntityIdPart)
    : undefined;
};

@customElement("ha-entity-id-format-editor")
export class HaEntityIdFormatEditor extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @property({ attribute: false }) public value: EntityIdFormat = [];

  @property() public label?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @query("ha-generic-picker") private _picker?: HaGenericPicker;

  private _editIndex?: number;

  protected render() {
    return html`
      <div class="container">
        ${this.label ? html`<label>${this.label}</label>` : nothing}
        <ha-generic-picker
          .disabled=${this.disabled}
          .getItems=${this._getFilteredItems}
          .rowRenderer=${rowRenderer}
          .value=${this._getPickerValue()}
          @value-changed=${this._pickerValueChanged}
          .searchLabel=${this._localize(
            "ui.panel.config.entity_id_format.card.editor.search"
          )}
        >
          <div slot="field" class="field">
            <ha-sortable
              no-style
              @item-moved=${this._moveItem}
              .disabled=${this.disabled}
              handle-selector="button.primary.action"
              filter=".add"
            >
              <ha-chip-set>
                ${repeat(
                  this.value,
                  (item) => item,
                  (item: EntityIdPart, idx) => {
                    const label = this._formatType(item);
                    if (REQUIRED_TYPES.includes(item)) {
                      return html`
                        <ha-assist-chip
                          filled
                          class="required"
                          .label=${label}
                          .disabled=${this.disabled}
                        >
                          <ha-svg-icon
                            slot="icon"
                            .path=${mdiDragHorizontalVariant}
                          ></ha-svg-icon>
                        </ha-assist-chip>
                      `;
                    }
                    return html`
                      <ha-input-chip
                        data-idx=${idx}
                        @remove=${this._removeItem}
                        @click=${this._editItem}
                        .label=${label}
                        .selected=${!this.disabled}
                        .disabled=${this.disabled}
                      >
                        <ha-svg-icon
                          slot="icon"
                          .path=${mdiDragHorizontalVariant}
                        ></ha-svg-icon>
                      </ha-input-chip>
                    `;
                  }
                )}
                ${
                  this.disabled
                    ? nothing
                    : html`
                        <ha-assist-chip
                          @click=${this._addItem}
                          .disabled=${this.disabled}
                          label=${this._localize(
                            "ui.panel.config.entity_id_format.card.editor.add"
                          )}
                          class="add"
                        >
                          <ha-svg-icon
                            slot="icon"
                            .path=${mdiPlus}
                          ></ha-svg-icon>
                        </ha-assist-chip>
                      `
                }
              </ha-chip-set>
            </ha-sortable>
          </div>
        </ha-generic-picker>
      </div>
    `;
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

  private _moveItem(ev: CustomEvent) {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;
    const newValue = this.value.concat();
    const element = newValue.splice(oldIndex, 1)[0];
    newValue.splice(newIndex, 0, element);
    this._setValue(newValue);
  }

  private _removeItem(ev: Event) {
    ev.stopPropagation();
    const value = [...this.value];
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

    const type = decodeType(value);
    if (!type) {
      return;
    }

    const newValue = [...this.value];

    if (this._editIndex != null) {
      newValue[this._editIndex] = type;
      this._editIndex = undefined;
    } else {
      newValue.push(type);
    }

    this._setValue(newValue);

    if (this._picker) {
      this._picker.value = undefined;
    }
  }

  private _setValue(value: EntityIdFormat) {
    this.value = value;
    fireEvent(this, "value-changed", { value });
  }

  private _formatType = (type: EntityIdPart) =>
    this._localize(`ui.components.entity.entity-name-picker.types.${type}`);

  private _getItems = memoizeOne(
    (localize: LocalizeFunc): PickerComboBoxItem[] =>
      STRUCTURAL_TYPES.map((type) => {
        const primary = localize(
          `ui.components.entity.entity-name-picker.types.${type}`
        );
        const id = encodeType(type);
        return {
          id,
          primary,
          search_labels: { primary, id },
          sorting_label: primary,
        };
      })
  );

  private _getPickerValue(): string | undefined {
    if (this._editIndex != null) {
      const item = this.value[this._editIndex];
      return item ? encodeType(item) : undefined;
    }
    return undefined;
  }

  private _getFilteredItems = (): PickerComboBoxItem[] => {
    const items = this._getItems(this._localize);
    const currentValue =
      this._editIndex != null
        ? encodeType(this.value[this._editIndex])
        : undefined;

    const usedValues = new Set(this.value.map((item) => encodeType(item)));

    return items.filter(
      (item) => !usedValues.has(item.id) || item.id === currentValue
    );
  };

  static styles = css`
    :host {
      position: relative;
      width: 100%;
    }

    .container {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }

    label {
      display: block;
      font-weight: 500;
    }

    ha-generic-picker {
      width: 100%;
    }

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
    :host([disabled]) .field:after {
      background-color: var(
        --mdc-text-field-disabled-line-color,
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

    ha-assist-chip.required {
      --ha-assist-chip-filled-container-color: rgba(
        var(--rgb-primary-text-color),
        0.15
      );
    }

    .add {
      order: 1;
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
    "ha-entity-id-format-editor": HaEntityIdFormatEditor;
  }
}
