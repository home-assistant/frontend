import {
  mdiClose,
  mdiDelete,
  mdiDragHorizontalVariant,
  mdiPencil,
} from "@mdi/js";
import deepClone from "deep-clone-simple";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import type { ObjectSelector } from "../../data/selector";
import { formatSelectorValue } from "../../data/selector/format_selector_value";
import { showFormDialog } from "../../dialogs/form/show-form-dialog";
import type { HomeAssistant } from "../../types";
import { computeInitialHaFormData } from "../ha-form/compute-initial-ha-form-data";
import type { HaFormSchema } from "../ha-form/types";
import "../ha-input-helper-text";
import "../ha-sortable";
import "../ha-yaml-editor";
import "../item/ha-list-item-base";
import "../list/ha-list-base";
import type { HaYamlEditor } from "../ha-yaml-editor";
import { deepEqual } from "../../common/util/deep-equal";

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

  @property({ attribute: false }) public localizeValue?: (
    key: string
  ) => string;

  @query("ha-yaml-editor", true) private _yamlEditor?: HaYamlEditor;

  private _valueChangedFromChild = false;

  private _computeLabel = (schema: HaFormSchema): string => {
    const translationKey = this.selector.object?.translation_key;

    if (this.localizeValue && translationKey) {
      const label =
        this.localizeValue(`${translationKey}.fields.${schema.name}.name`) ||
        // Fallback for backward compatibility
        this.localizeValue(`${translationKey}.fields.${schema.name}`);
      if (label) {
        return label;
      }
    }
    return this.selector.object?.fields?.[schema.name]?.label || schema.name;
  };

  private _computeHelper = (schema: HaFormSchema): string => {
    const translationKey = this.selector.object?.translation_key;

    if (this.localizeValue && translationKey) {
      const helper = this.localizeValue(
        `${translationKey}.fields.${schema.name}.description`
      );
      if (helper) {
        return helper;
      }
    }
    return this.selector.object?.fields?.[schema.name]?.description || "";
  };

  private _renderItem(item: any, index: number) {
    const fields = this.selector.object!.fields!;
    const preferredLabel = this.selector.object!.label_field;
    const hasValidLabelField = preferredLabel && preferredLabel in fields;

    const label = hasValidLabelField
      ? formatSelectorValue(
          this.hass,
          item[preferredLabel!],
          fields[preferredLabel!]?.selector
        )
      : Object.entries(fields)
          .map(([key, field]) =>
            formatSelectorValue(this.hass, item[key], field.selector)
          )
          .filter(Boolean)
          .join(" · ");

    let description = "";

    const descriptionField = this.selector.object!.description_field;
    if (descriptionField && descriptionField in fields) {
      const descriptionSelector = fields[descriptionField]?.selector;

      description = descriptionSelector
        ? formatSelectorValue(
            this.hass,
            item[descriptionField],
            descriptionSelector
          )
        : "";
    }

    const reorderable = this.selector.object!.multiple || false;
    const multiple = this.selector.object!.multiple || false;
    return html`
      <ha-list-item-base class="item">
        ${
          reorderable
            ? html`
                <ha-svg-icon
                  class="handle"
                  .path=${mdiDragHorizontalVariant}
                  slot="start"
                ></ha-svg-icon>
              `
            : nothing
        }
        <div slot="headline" class="label">${label}</div>
        ${
          description
            ? html`<div slot="supporting-text" class="description">
                ${description}
              </div>`
            : nothing
        }
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
      </ha-list-item-base>
    `;
  }

  protected render() {
    if (this.selector.object?.fields) {
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
              <ha-list-base>
                ${items.map((item, index) => this._renderItem(item, index))}
              </ha-list-base>
            </ha-sortable>
            <ha-button appearance="filled" @click=${this._addItem}>
              ${this.hass.localize("ui.common.add")}
            </ha-button>
          </div>
        `;
      }

      return html`
        ${this.label ? html`<label>${this.label}</label>` : nothing}
        <div class="items-container">
          ${
            this.value
              ? html`<ha-list-base>
                  ${this._renderItem(this.value, 0)}
                </ha-list-base>`
              : html`
                  <ha-button appearance="filled" @click=${this._addItem}>
                    ${this.hass.localize("ui.common.add")}
                  </ha-button>
                `
          }
        </div>
      `;
    }

    return html`<ha-yaml-editor
        .readonly=${this.disabled}
        .label=${this.label}
        .required=${this.required}
        .placeholder=${this.placeholder}
        .defaultValue=${this.value}
        @value-changed=${this._handleChange}
      ></ha-yaml-editor>
      ${
        this.helper
          ? html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
          : ""
      } `;
  }

  private _schema = memoizeOne((selector: ObjectSelector) => {
    if (!selector.object || !selector.object.fields) {
      return [];
    }
    return Object.entries(selector.object.fields).map(([key, field]) => ({
      name: key,
      selector: field.selector,
      required: field.required ?? false,
      ...("default" in field
        ? { default: field.default as HaFormSchema["default"] }
        : {}),
    }));
  });

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

    const schema = this._schema(this.selector);
    const data = {
      ...computeInitialHaFormData(schema, {
        skipUnsupportedSelectors: true,
      }),
      ...Object.fromEntries(
        schema
          .filter((field) => "default" in field)
          .map((field) => [field.name, deepClone(field.default)])
      ),
    };

    const newItem = await showFormDialog(this, {
      title: this.hass.localize("ui.common.add"),
      schema,
      data,
      computeLabel: this._computeLabel,
      computeHelper: this._computeHelper,
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
      schema: this._schema(this.selector),
      data: item,
      computeLabel: this._computeLabel,
      computeHelper: this._computeHelper,
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
      fireEvent(this, "value-changed", { value: "" });
      return;
    }

    const newValue = ensureArray(this.value ?? []).concat();
    newValue.splice(index, 1);
    fireEvent(this, "value-changed", { value: newValue });
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    if (
      changedProps.has("value") &&
      !this._valueChangedFromChild &&
      this._yamlEditor &&
      !deepEqual(this.value, changedProps.get("value"))
    ) {
      this._yamlEditor.setValue(this.value);
    }
    this._valueChangedFromChild = false;
  }

  private _handleChange(ev) {
    ev.stopPropagation();
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
        ha-list-base {
          --ha-list-gap: var(--ha-space-2);
          --ha-list-padding: var(--ha-space-2) 0;
        }
        ha-list-item-base {
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-md);
          --ha-row-item-gap: 0;
          --ha-row-item-padding-block: 0;
          --ha-row-item-padding-inline: var(--ha-space-3) var(--ha-space-1);
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
        ha-list-item-base .label,
        ha-list-item-base .description {
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
