import "@material/mwc-button/mwc-button";
import "@polymer/paper-input/paper-input";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import "../../../components/ha-icon-input";
import "../../../components/ha-switch";
import type { HaSwitch } from "../../../components/ha-switch";
import {
  EntityRegistryEntryUpdateParams,
  ExtEntityRegistryEntry,
  removeEntityRegistryEntry,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import type { PolymerChangedEvent } from "../../../polymer-types";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

@customElement("entity-registry-settings")
export class EntityRegistrySettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entry!: ExtEntityRegistryEntry;

  @internalProperty() private _name!: string;

  @internalProperty() private _icon!: string;

  @internalProperty() private _entityId!: string;

  @internalProperty() private _disabledBy!: string | null;

  @internalProperty() private _error?: string;

  @internalProperty() private _submitting?: boolean;

  private _origEntityId!: string;

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has("entry")) {
      this._error = undefined;
      this._name = this.entry.name || "";
      this._icon = this.entry.icon || "";
      this._origEntityId = this.entry.entity_id;
      this._entityId = this.entry.entity_id;
      this._disabledBy = this.entry.disabled_by;
    }
  }

  protected render(): TemplateResult {
    if (this.entry.entity_id !== this._origEntityId) {
      return html``;
    }
    const stateObj: HassEntity | undefined = this.hass.states[
      this.entry.entity_id
    ];
    const invalidDomainUpdate =
      computeDomain(this._entityId.trim()) !==
      computeDomain(this.entry.entity_id);
    return html`
      ${!stateObj
        ? html`
            <div class="container">
              ${this.hass!.localize(
                "ui.dialogs.entity_registry.editor.unavailable"
              )}
            </div>
          `
        : ""}
      ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
      <div class="form container">
        <paper-input
          .value=${this._name}
          @value-changed=${this._nameChanged}
          .label=${this.hass.localize("ui.dialogs.entity_registry.editor.name")}
          .placeholder=${this.entry.original_name}
          .disabled=${this._submitting}
        ></paper-input>
        <ha-icon-input
          .value=${this._icon}
          @value-changed=${this._iconChanged}
          .label=${this.hass.localize("ui.dialogs.entity_registry.editor.icon")}
          .placeholder=${this.entry.original_icon}
          .disabled=${this._submitting}
          .errorMessage=${this.hass.localize(
            "ui.dialogs.entity_registry.editor.icon_error"
          )}
        ></ha-icon-input>
        <paper-input
          .value=${this._entityId}
          @value-changed=${this._entityIdChanged}
          .label=${this.hass.localize(
            "ui.dialogs.entity_registry.editor.entity_id"
          )}
          error-message="Domain needs to stay the same"
          .invalid=${invalidDomainUpdate}
          .disabled=${this._submitting}
        ></paper-input>
        <div class="row">
          <ha-switch
            .checked=${!this._disabledBy}
            @change=${this._disabledByChanged}
          >
          </ha-switch>
          <div>
            <div>
              ${this.hass.localize(
                "ui.dialogs.entity_registry.editor.enabled_label"
              )}
            </div>
            <div class="secondary">
              ${this._disabledBy && this._disabledBy !== "user"
                ? this.hass.localize(
                    "ui.dialogs.entity_registry.editor.enabled_cause",
                    "cause",
                    this.hass.localize(
                      `config_entry.disabled_by.${this._disabledBy}`
                    )
                  )
                : ""}
              ${this.hass.localize(
                "ui.dialogs.entity_registry.editor.enabled_description"
              )}
              <br />${this.hass.localize(
                "ui.dialogs.entity_registry.editor.note"
              )}
            </div>
          </div>
        </div>
      </div>
      <div class="buttons">
        <mwc-button
          class="warning"
          @click="${this._confirmDeleteEntry}"
          .disabled=${this._submitting ||
          !(stateObj && stateObj.attributes.restored)}
        >
          ${this.hass.localize("ui.dialogs.entity_registry.editor.delete")}
        </mwc-button>
        <mwc-button
          @click="${this._updateEntry}"
          .disabled=${invalidDomainUpdate || this._submitting}
        >
          ${this.hass.localize("ui.dialogs.entity_registry.editor.update")}
        </mwc-button>
      </div>
    `;
  }

  private _nameChanged(ev: PolymerChangedEvent<string>): void {
    this._error = undefined;
    this._name = ev.detail.value;
  }

  private _iconChanged(ev: PolymerChangedEvent<string>): void {
    this._error = undefined;
    this._icon = ev.detail.value;
  }

  private _entityIdChanged(ev: PolymerChangedEvent<string>): void {
    this._error = undefined;
    this._entityId = ev.detail.value;
  }

  private async _updateEntry(): Promise<void> {
    this._submitting = true;
    const params: Partial<EntityRegistryEntryUpdateParams> = {
      name: this._name.trim() || null,
      icon: this._icon.trim() || null,
      new_entity_id: this._entityId.trim(),
    };
    if (this._disabledBy === null || this._disabledBy === "user") {
      params.disabled_by = this._disabledBy;
    }
    try {
      await updateEntityRegistryEntry(this.hass!, this._origEntityId, params);
      fireEvent(this as HTMLElement, "close-dialog");
    } catch (err) {
      this._error = err.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _confirmDeleteEntry(): Promise<void> {
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
      await removeEntityRegistryEntry(this.hass!, this._origEntityId);
      fireEvent(this, "close-dialog");
    } finally {
      this._submitting = false;
    }
  }

  private _disabledByChanged(ev: Event): void {
    this._disabledBy = (ev.target as HaSwitch).checked ? null : "user";
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }
        .container {
          padding: 20px 24px;
        }
        .form {
          margin-bottom: 53px;
        }
        .buttons {
          position: absolute;
          bottom: 0;
          width: 100%;
          box-sizing: border-box;
          border-top: 1px solid
            var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
          display: flex;
          justify-content: space-between;
          padding: 8px;
          padding-bottom: max(env(safe-area-inset-bottom), 8px);
          background-color: var(--mdc-theme-surface, #fff);
        }
        ha-switch {
          margin-right: 16px;
        }
        .row {
          margin-top: 8px;
          color: var(--primary-text-color);
          display: flex;
          align-items: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entity-registry-settings": EntityRegistrySettings;
  }
}
