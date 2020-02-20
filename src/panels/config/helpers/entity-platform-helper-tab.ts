import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
  query,
} from "lit-element";
import { ExtEntityRegistryEntry } from "../../../data/entity_registry";
import { HomeAssistant } from "../../../types";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { fireEvent } from "../../../common/dom/fire_event";
import "../entities/entity-registry-id-enable";
import "./forms/ha-input_boolean-form";
import { HaPaperDialog } from "../../../components/dialog/ha-paper-dialog";
import { Helper } from "./ha-config-helpers";
import { dynamicElement } from "../../../common/dom/dynamic-element-directive";
import {
  fetchInputBoolean,
  updateInputBoolean,
  deleteInputBoolean,
} from "../../../data/input_boolean";
import {
  fetchInputText,
  updateInputText,
  deleteInputText,
} from "../../../data/input_text";
import {
  fetchInputNumber,
  updateInputNumber,
  deleteInputNumber,
} from "../../../data/input_number";
import {
  fetchInputDateTime,
  updateInputDateTime,
  deleteInputDateTime,
} from "../../../data/input_datetime";
import {
  fetchInputSelect,
  updateInputSelect,
  deleteInputSelect,
} from "../../../data/input_select";
// tslint:disable-next-line: no-duplicate-imports
import { HaEntityRegIdEnable } from "../entities/entity-registry-id-enable";

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

@customElement("entity-platform-helper-tab")
export class EntityRegistrySettingsHelper extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public entry!: ExtEntityRegistryEntry;
  @property() public dialogElement!: HaPaperDialog;
  @property() public platform!: string;
  @property() private _error?: string;
  @property() private _item?: Helper | null;
  @property() private _submitting?: boolean;
  @property() private _componentLoaded?: boolean;
  @query("ha-registry-id-enable") private _registryEditor?: HaEntityRegIdEnable;

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    this._componentLoaded = isComponentLoaded(this.hass, this.platform);
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
          The ${this.platform} component is not loaded, please add it your
          configuration. Either by adding 'default_config:' or
          '${this.platform}:'.
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
            ${dynamicElement(`ha-${this.platform}-form`, {
              hass: this.hass,
              item: this._item,
              entry: this.entry,
            })}
          </div>
          <ha-registry-id-enable
            .hass=${this.hass}
            .entry=${this.entry}
          ></ha-registry-id-enable>
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
    const items = await HELPERS[this.platform].fetch(this.hass!);
    this._item = items.find((item) => item.id === this.entry.unique_id) || null;
  }

  private async _updateItem(): Promise<void> {
    if (!this._item) {
      return;
    }
    this._submitting = true;
    try {
      await HELPERS[this.platform].update(
        this.hass!,
        this._item.id,
        this._item
      );
      await this._registryEditor?.updateEntry();
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
      await HELPERS[this.platform].delete(this.hass!, this._item.id);
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
