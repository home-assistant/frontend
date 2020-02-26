import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  query,
  TemplateResult,
} from "lit-element";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import { dynamicElement } from "../../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { HaPaperDialog } from "../../../../../components/dialog/ha-paper-dialog";
import { ExtEntityRegistryEntry } from "../../../../../data/entity_registry";
import {
  deleteInputBoolean,
  fetchInputBoolean,
  updateInputBoolean,
} from "../../../../../data/input_boolean";
import {
  deleteInputDateTime,
  fetchInputDateTime,
  updateInputDateTime,
} from "../../../../../data/input_datetime";
import {
  deleteInputNumber,
  fetchInputNumber,
  updateInputNumber,
} from "../../../../../data/input_number";
import {
  deleteInputSelect,
  fetchInputSelect,
  updateInputSelect,
} from "../../../../../data/input_select";
import {
  deleteInputText,
  fetchInputText,
  updateInputText,
} from "../../../../../data/input_text";
import { showConfirmationDialog } from "../../../../../dialogs/generic/show-dialog-box";
import { HomeAssistant } from "../../../../../types";
import "../../../helpers/forms/ha-input_boolean-form";
import "../../../helpers/forms/ha-input_text-form";
import "../../../helpers/forms/ha-input_datetime-form";
import "../../../helpers/forms/ha-input_select-form";
import "../../../helpers/forms/ha-input_number-form";
import { Helper } from "../../../helpers/const";
import "../../entity-registry-basic-editor";
// tslint:disable-next-line: no-duplicate-imports
import { HaEntityRegistryBasicEditor } from "../../entity-registry-basic-editor";

const HELPERS = {
  input_boolean: {
    fetch: fetchInputBoolean,
    update: updateInputBoolean,
    delete: deleteInputBoolean,
  },
  input_text: {
    fetch: fetchInputText,
    update: updateInputText,
    delete: deleteInputText,
  },
  input_number: {
    fetch: fetchInputNumber,
    update: updateInputNumber,
    delete: deleteInputNumber,
  },
  input_datetime: {
    fetch: fetchInputDateTime,
    update: updateInputDateTime,
    delete: deleteInputDateTime,
  },
  input_select: {
    fetch: fetchInputSelect,
    update: updateInputSelect,
    delete: deleteInputSelect,
  },
};

@customElement("entity-settings-helper-tab")
export class EntityRegistrySettingsHelper extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public entry!: ExtEntityRegistryEntry;
  @property() public dialogElement!: HaPaperDialog;
  @property() private _error?: string;
  @property() private _item?: Helper | null;
  @property() private _submitting?: boolean;
  @property() private _componentLoaded?: boolean;
  @query("ha-registry-basic-editor")
  private _registryEditor?: HaEntityRegistryBasicEditor;

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this._componentLoaded = isComponentLoaded(this.hass, this.entry.platform);
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has("entry")) {
      this._error = undefined;
      this._item = undefined;
      this._getItem();
    }
  }

  protected render(): TemplateResult {
    if (this._item === undefined) {
      return html``;
    }
    if (!this._componentLoaded) {
      return html`
        <paper-dialog-scrollable .dialogElement=${this.dialogElement}>
          The ${this.entry.platform} component is not loaded, please add it your
          configuration. Either by adding 'default_config:' or
          '${this.entry.platform}:'.
        </paper-dialog-scrollable>
      `;
    }
    if (this._item === null) {
      return html`
        <paper-dialog-scrollable .dialogElement=${this.dialogElement}>
          This entity can not be edited from the UI. Only entities setup from
          the UI are editable.
        </paper-dialog-scrollable>
      `;
    }
    return html`
      <paper-dialog-scrollable .dialogElement=${this.dialogElement}>
        ${this._error
          ? html`
              <div class="error">${this._error}</div>
            `
          : ""}
        <div class="form">
          <div @value-changed=${this._valueChanged}>
            ${dynamicElement(`ha-${this.entry.platform}-form`, {
              hass: this.hass,
              item: this._item,
              entry: this.entry,
            })}
          </div>
          <ha-registry-basic-editor
            .hass=${this.hass}
            .entry=${this.entry}
          ></ha-registry-basic-editor>
        </div>
      </paper-dialog-scrollable>
      <div class="buttons">
        <mwc-button
          class="warning"
          @click=${this._confirmDeleteItem}
          .disabled=${this._submitting}
        >
          ${this.hass.localize("ui.dialogs.entity_registry.editor.delete")}
        </mwc-button>
        <mwc-button
          @click=${this._updateItem}
          .disabled=${this._submitting || !this._item.name}
        >
          ${this.hass.localize("ui.dialogs.entity_registry.editor.update")}
        </mwc-button>
      </div>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    this._error = undefined;
    this._item = ev.detail.value;
  }

  private async _getItem() {
    const items = await HELPERS[this.entry.platform].fetch(this.hass!);
    this._item = items.find((item) => item.id === this.entry.unique_id) || null;
    await this.updateComplete;
    fireEvent(this.dialogElement as HTMLElement, "iron-resize");
  }

  private async _updateItem(): Promise<void> {
    if (!this._item) {
      return;
    }
    this._submitting = true;
    try {
      await HELPERS[this.entry.platform].update(
        this.hass!,
        this._item.id,
        this._item
      );
      await this._registryEditor?.updateEntry();
      fireEvent(this, "close-dialog");
    } catch (err) {
      this._error = err.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _confirmDeleteItem(): Promise<void> {
    if (!this._item) {
      return;
    }
    if (
      !(await showConfirmationDialog(this, {
        text: this.hass.localize(
          "ui.dialogs.entity_registry.editor.confirm_delete"
        ),
      }))
    ) {
      return;
    }

    this._submitting = true;

    try {
      await HELPERS[this.entry.platform].delete(this.hass!, this._item.id);
      fireEvent(this, "close-dialog");
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        padding: 0 !important;
      }
      .form {
        padding-bottom: 24px;
      }
      .buttons {
        display: flex;
        justify-content: space-between;
        padding: 8px;
        margin-bottom: -20px;
      }
      mwc-button.warning {
        --mdc-theme-primary: var(--google-red-500);
      }
      .error {
        color: var(--google-red-500);
      }
      .row {
        margin-top: 8px;
        color: var(--primary-text-color);
      }
      .secondary {
        color: var(--secondary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entity-platform-helper-tab": EntityRegistrySettingsHelper;
  }
}
