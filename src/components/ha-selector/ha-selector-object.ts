import { mdiClose, mdiDelete, mdiDrag, mdiPencil } from "@mdi/js";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import type { ObjectSelector } from "../../data/selector";
import { computeSelectorLabel, getSelector } from "../../data/selector-label";
import { showFormDialog } from "../../dialogs/form/show-form-dialog";
import type { HomeAssistant } from "../../types";
import type { HaFormDataContainer } from "../ha-form/types";
import "../ha-input-helper-text";
import "../ha-md-list";
import "../ha-md-list-item";
import "../ha-sortable";
import "../ha-yaml-editor";
import type { HaYamlEditor } from "../ha-yaml-editor";

@customElement("ha-selector-object")
export class HaObjectSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: ObjectSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: false }) public computeLabel?: (
    schema: any,
    data: HaFormDataContainer
  ) => string;

  @property({ attribute: false }) public computeHelper?: (
    schema: any
  ) => string | undefined;

  @query("ha-yaml-editor", true) private _yamlEditor?: HaYamlEditor;

  private _valueChangedFromChild = false;

  private _renderItem(item: any, index: number) {
    const labelKey =
      this.selector.object!.label_key || this.selector.object!.schema![0].name;

    const labelSelector = getSelector(labelKey, this.selector.object!.schema!);

    const label = computeSelectorLabel(
      this.hass,
      item[labelKey],
      labelSelector
    );

    const descriptionKey = this.selector.object!.description_key;

    let description: string | undefined;

    if (descriptionKey) {
      const descriptionSelector = getSelector(
        descriptionKey,
        this.selector.object!.schema!
      );

      description = computeSelectorLabel(
        this.hass,
        item[descriptionKey],
        descriptionSelector
      );
    }

    const reorderable = this.selector.object!.multiple;
    const multiple = this.selector.object!.multiple || false;
    return html`
      <ha-md-list-item class="item">
        ${reorderable
          ? html`
              <ha-svg-icon
                class="handle"
                .path=${mdiDrag}
                slot="start"
              ></ha-svg-icon>
            `
          : nothing}
        <div slot="headline" class="label">${label}</div>
        ${description
          ? html`<div slot="supporting-text" class="description">
              ${description}
            </div>`
          : nothing}
        <ha-icon-button
          slot="end"
          .item=${item}
          .index=${index}
          .label=${this.hass.localize("ui.common.edit")}
          .path=${mdiPencil}
          @click=${this._editItem}
        ></ha-icon-button>
        <ha-icon-button
          slot="end"
          .index=${index}
          .label=${this.hass.localize("ui.common.delete")}
          .path=${multiple ? mdiDelete : mdiClose}
          @click=${this._deleteItem}
        ></ha-icon-button>
      </ha-md-list-item>
    `;
  }

  protected render() {
    if (!this.selector.object) {
      return nothing;
    }

    if (this.selector.object.schema) {
      if (this.selector.object.multiple) {
        const items = ensureArray(this.value ?? []);
        return html`
          ${this.label ? html`<label>${this.label}</label>` : nothing}
          <div class="items-container">
            <ha-sortable
              handle-selector=".handle"
              draggable-selector=".item"
              @item-moved=${this._itemMoved}
            >
              <ha-md-list>
                ${items.map((item, index) => this._renderItem(item, index))}
              </ha-md-list>
            </ha-sortable>
            <ha-button outlined @click=${this._addItem}>
              ${this.hass.localize("ui.common.add")}
            </ha-button>
          </div>
        `;
      }

      return html`
        ${this.label ? html`<label>${this.label}</label>` : nothing}
        <div class="items-container">
          ${this.value
            ? html`<ha-md-list>
                ${this._renderItem(this.value, 0)}
              </ha-md-list>`
            : html`
                <ha-button outlined @click=${this._addItem}>
                  ${this.hass.localize("ui.common.add")}
                </ha-button>
              `}
        </div>
      `;
    }

    return html`<ha-yaml-editor
        .hass=${this.hass}
        .readonly=${this.disabled}
        .label=${this.label}
        .required=${this.required}
        .placeholder=${this.placeholder}
        .defaultValue=${this.value}
        @value-changed=${this._handleChange}
      ></ha-yaml-editor>
      ${this.helper
        ? html`<ha-input-helper-text .disabled=${this.disabled}
            >${this.helper}</ha-input-helper-text
          >`
        : ""} `;
  }

  private _itemMoved(ev) {
    ev.stopPropagation();
    const newIndex = ev.detail.newIndex;
    const oldIndex = ev.detail.oldIndex;
    if (!this.selector.object!.multiple) {
      return;
    }
    const newValue = ensureArray(this.value ?? []).concat();
    const item = newValue.splice(oldIndex, 1)[0];
    newValue.splice(newIndex, 0, item);
    fireEvent(this, "value-changed", { value: newValue });
  }

  private async _addItem(ev) {
    ev.stopPropagation();

    const newItem = await showFormDialog(this, {
      title: this.hass.localize("ui.common.add"),
      schema: this.selector.object!.schema!,
      data: {},
      computeLabel: this.computeLabel,
      computeHelper: this.computeHelper,
      submitText: this.hass.localize("ui.common.add"),
    });

    if (newItem === null) {
      return;
    }

    if (!this.selector.object!.multiple) {
      fireEvent(this, "value-changed", { value: newItem });
      return;
    }

    const newValue = ensureArray(this.value ?? []).concat();
    newValue.push(newItem);
    fireEvent(this, "value-changed", { value: newValue });
  }

  private async _editItem(ev) {
    ev.stopPropagation();
    const item = ev.currentTarget.item;
    const index = ev.currentTarget.index;

    const updatedItem = await showFormDialog(this, {
      title: this.hass.localize("ui.common.edit"),
      schema: this.selector.object!.schema!,
      data: item,
      computeLabel: this.computeLabel,
      computeHelper: this.computeHelper,
      submitText: this.hass.localize("ui.common.save"),
    });

    if (updatedItem === null) {
      return;
    }

    if (!this.selector.object!.multiple) {
      fireEvent(this, "value-changed", { value: updatedItem });
      return;
    }

    const newValue = ensureArray(this.value ?? []).concat();
    newValue[index] = updatedItem;
    fireEvent(this, "value-changed", { value: newValue });
  }

  private _deleteItem(ev) {
    ev.stopPropagation();
    const index = ev.currentTarget.index;

    if (!this.selector.object!.multiple) {
      fireEvent(this, "value-changed", { value: undefined });
      return;
    }

    const newValue = ensureArray(this.value ?? []).concat();
    newValue.splice(index, 1);
    fireEvent(this, "value-changed", { value: newValue });
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (
      changedProps.has("value") &&
      !this._valueChangedFromChild &&
      this._yamlEditor
    ) {
      this._yamlEditor.setValue(this.value);
    }
    this._valueChangedFromChild = false;
  }

  private _handleChange(ev) {
    this._valueChangedFromChild = true;
    const value = ev.target.value;
    if (!ev.target.isValid) {
      return;
    }
    if (this.value === value) {
      return;
    }
    fireEvent(this, "value-changed", { value });
  }

  static get styles() {
    return [
      css`
        ha-md-list {
          gap: 8px;
        }
        ha-md-list-item {
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          --ha-md-list-item-gap: 0;
          --md-list-item-top-space: 0;
          --md-list-item-bottom-space: 0;
          --md-list-item-leading-space: 12px;
          --md-list-item-trailing-space: 4px;
          --md-list-item-two-line-container-height: 48px;
          --md-list-item-one-line-container-height: 48px;
        }
        .handle {
          cursor: move;
          padding: 8px;
          margin-inline-start: -8px;
        }
        label {
          margin-bottom: 8px;
          display: block;
        }
        ha-md-list-item .label,
        ha-md-list-item .description {
          text-overflow: ellipsis;
          overflow: hidden;
          white-space: nowrap;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-object": HaObjectSelector;
  }
}
