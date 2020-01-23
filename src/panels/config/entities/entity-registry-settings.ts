import {
  LitElement,
  html,
  css,
  CSSResult,
  TemplateResult,
  property,
  customElement,
  PropertyValues,
} from "lit-element";
import "@polymer/paper-input/paper-input";

import "../../../components/ha-switch";

import { PolymerChangedEvent } from "../../../polymer-types";
import { HomeAssistant } from "../../../types";
import { HassEntity } from "home-assistant-js-websocket";
// tslint:disable-next-line: no-duplicate-imports
import { HaSwitch } from "../../../components/ha-switch";

import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import {
  updateEntityRegistryEntry,
  removeEntityRegistryEntry,
  EntityRegistryEntry,
} from "../../../data/entity_registry";
import { showConfirmationDialog } from "../../../dialogs/generic/show-dialog-box";
import { fireEvent } from "../../../common/dom/fire_event";

@customElement("entity-registry-settings")
export class EntityRegistrySettings extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public entry!: EntityRegistryEntry;
  @property() public dialogElement!: HTMLElement;
  @property() private _name!: string;
  @property() private _entityId!: string;
  @property() private _disabledBy!: string | null;
  @property() private _error?: string;
  @property() private _submitting?: boolean;
  private _origEntityId!: string;

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("entry")) {
      this._error = undefined;
      this._name = this.entry.name || "";
      this._origEntityId = this.entry.entity_id;
      this._entityId = this.entry.entity_id;
      this._disabledBy = this.entry.disabled_by;
    }
  }

  protected render(): TemplateResult | void {
    if (this.entry.entity_id !== this._origEntityId) {
      return;
    }
    const stateObj: HassEntity | undefined = this.hass.states[
      this.entry.entity_id
    ];
    const invalidDomainUpdate =
      computeDomain(this._entityId.trim()) !==
      computeDomain(this.entry.entity_id);

    return html`
      <paper-dialog-scrollable .dialogElement=${this.dialogElement}>
        ${!stateObj
          ? html`
              <div>
                ${this.hass!.localize(
                  "ui.panel.config.entities.editor.unavailable"
                )}
              </div>
            `
          : ""}
        ${this._error
          ? html`
              <div class="error">${this._error}</div>
            `
          : ""}
        <div class="form">
          <paper-input
            .value=${this._name}
            @value-changed=${this._nameChanged}
            .label=${this.hass.localize("ui.panel.config.entities.editor.name")}
            .placeholder=${stateObj ? computeStateName(stateObj) : ""}
            .disabled=${this._submitting}
          ></paper-input>
          <paper-input
            .value=${this._entityId}
            @value-changed=${this._entityIdChanged}
            .label=${this.hass.localize(
              "ui.panel.config.entities.editor.entity_id"
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
              <div>
                <div>
                  ${this.hass.localize(
                    "ui.panel.config.entities.editor.enabled_label"
                  )}
                </div>
                <div class="secondary">
                  ${this._disabledBy && this._disabledBy !== "user"
                    ? this.hass.localize(
                        "ui.panel.config.entities.editor.enabled_cause",
                        "cause",
                        this.hass.localize(
                          `config_entry.disabled_by.${this._disabledBy}`
                        )
                      )
                    : ""}
                  ${this.hass.localize(
                    "ui.panel.config.entities.editor.enabled_description"
                  )}
                  <br />${this.hass.localize(
                    "ui.panel.config.entities.editor.note"
                  )}
                </div>
              </div>
            </ha-switch>
          </div>
        </div>
      </paper-dialog-scrollable>
      <div class="buttons">
        <mwc-button
          class="warning"
          @click="${this._confirmDeleteEntry}"
          .disabled=${this._submitting ||
            !(stateObj && stateObj.attributes.restored)}
        >
          ${this.hass.localize("ui.panel.config.entities.editor.delete")}
        </mwc-button>
        <mwc-button
          @click="${this._updateEntry}"
          .disabled=${invalidDomainUpdate || this._submitting}
        >
          ${this.hass.localize("ui.panel.config.entities.editor.update")}
        </mwc-button>
      </div>
    `;
  }

  private _nameChanged(ev: PolymerChangedEvent<string>): void {
    this._error = undefined;
    this._name = ev.detail.value;
  }

  private _entityIdChanged(ev: PolymerChangedEvent<string>): void {
    this._error = undefined;
    this._entityId = ev.detail.value;
  }

  private async _updateEntry(): Promise<void> {
    this._submitting = true;
    try {
      await updateEntityRegistryEntry(this.hass!, this._origEntityId, {
        name: this._name.trim() || null,
        disabled_by: this._disabledBy,
        new_entity_id: this._entityId.trim(),
      });
      fireEvent(this as HTMLElement, "close-dialog");
    } catch (err) {
      this._error = err.message || "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _deleteEntry(): Promise<void> {
    this._submitting = true;

    try {
      await removeEntityRegistryEntry(this.hass!, this._entityId);
      fireEvent(this as HTMLElement, "close-dialog");
    } finally {
      this._submitting = false;
    }
  }

  private _confirmDeleteEntry(): void {
    showConfirmationDialog(this, {
      text: this.hass.localize(
        "ui.panel.config.entities.editor.confirm_delete"
      ),
      confirm: () => this._deleteEntry(),
    });
  }

  private _disabledByChanged(ev: Event): void {
    this._disabledBy = (ev.target as HaSwitch).checked ? null : "user";
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        margin-bottom: 0 !important;
        padding: 0 !important;
      }
      .form {
        padding-bottom: 24px;
      }
      .buttons {
        display: flex;
        justify-content: flex-end;
        padding: 8px;
      }
      mwc-button.warning {
        margin-right: auto;
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
    "entity-registry-settings": EntityRegistrySettings;
  }
}
