import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import { dynamicElement } from "../../../../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../../../../common/dom/fire_event";
import {
  ExtEntityRegistryEntry,
  removeEntityRegistryEntry,
} from "../../../../../data/entity_registry";
import { HELPERS_CRUD } from "../../../../../data/helpers_crud";
import { showConfirmationDialog } from "../../../../../dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { Helper } from "../../../helpers/const";
import "../../../helpers/forms/ha-counter-form";
import "../../../helpers/forms/ha-input_boolean-form";
import "../../../helpers/forms/ha-input_button-form";
import "../../../helpers/forms/ha-input_datetime-form";
import "../../../helpers/forms/ha-input_number-form";
import "../../../helpers/forms/ha-input_select-form";
import "../../../helpers/forms/ha-input_text-form";
import "../../../helpers/forms/ha-schedule-form";
import "../../../helpers/forms/ha-timer-form";
import "../../entity-registry-basic-editor";
import type { HaEntityRegistryBasicEditor } from "../../entity-registry-basic-editor";

@customElement("entity-settings-helper-tab")
export class EntityRegistrySettingsHelper extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entry!: ExtEntityRegistryEntry;

  @state() private _error?: string;

  @state() private _item?: Helper | null;

  @state() private _submitting?: boolean;

  @state() private _componentLoaded?: boolean;

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
    const stateObj = this.hass.states[this.entry.entity_id];
    return html`
      <div class="form">
        ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
        ${!this._componentLoaded
          ? this.hass.localize(
              "ui.dialogs.helper_settings.platform_not_loaded",
              "platform",
              this.entry.platform
            )
          : this._item === null
          ? this.hass.localize("ui.dialogs.helper_settings.yaml_not_editable")
          : html`
              <span @value-changed=${this._valueChanged}>
                ${dynamicElement(`ha-${this.entry.platform}-form`, {
                  hass: this.hass,
                  item: this._item,
                  entry: this.entry,
                })}
              </span>
            `}
        <ha-registry-basic-editor
          .hass=${this.hass}
          .entry=${this.entry}
        ></ha-registry-basic-editor>
      </div>
      <div class="buttons">
        <mwc-button
          class="warning"
          @click=${this._confirmDeleteItem}
          .disabled=${this._submitting ||
          (!this._item && !stateObj?.attributes.restored)}
        >
          ${this.hass.localize("ui.dialogs.entity_registry.editor.delete")}
        </mwc-button>
        <mwc-button
          @click=${this._updateItem}
          .disabled=${this._submitting || (this._item && !this._item.name)}
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
    const items = await HELPERS_CRUD[this.entry.platform].fetch(this.hass!);
    this._item = items.find((item) => item.id === this.entry.unique_id) || null;
  }

  private async _updateItem(): Promise<void> {
    this._submitting = true;
    try {
      if (this._componentLoaded && this._item) {
        await HELPERS_CRUD[this.entry.platform].update(
          this.hass!,
          this._item.id,
          this._item
        );
      }
      await this._registryEditor?.updateEntry();
      fireEvent(this, "close-dialog");
    } catch (err: any) {
      this._error = err.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _confirmDeleteItem(): Promise<void> {
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
      if (this._componentLoaded && this._item) {
        await HELPERS_CRUD[this.entry.platform].delete(
          this.hass!,
          this._item.id
        );
      } else {
        const stateObj = this.hass.states[this.entry.entity_id];
        if (!stateObj?.attributes.restored) {
          return;
        }
        await removeEntityRegistryEntry(this.hass!, this.entry.entity_id);
      }
      fireEvent(this, "close-dialog");
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
          padding: 0 !important;
        }
        .form {
          padding: 20px 24px;
        }
        .buttons {
          box-sizing: border-box;
          display: flex;
          justify-content: space-between;
          padding: 0 24px 24px 24px;
          background-color: var(--mdc-theme-surface, #fff);
        }
        .error {
          color: var(--error-color);
          margin-bottom: 8px;
        }
        .row {
          margin-top: 8px;
          color: var(--primary-text-color);
        }
        .secondary {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entity-platform-helper-tab": EntityRegistrySettingsHelper;
  }
}
