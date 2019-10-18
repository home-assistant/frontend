import {
  LitElement,
  html,
  css,
  CSSResult,
  TemplateResult,
  property,
} from "lit-element";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-input/paper-input";

import "../../../components/dialog/ha-paper-dialog";
import "../../../components/ha-switch";

import { EntityRegistryDetailDialogParams } from "./show-dialog-entity-registry-detail";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { HassEntity } from "home-assistant-js-websocket";
// tslint:disable-next-line: no-duplicate-imports
import { HaSwitch } from "../../../components/ha-switch";

import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import {
  updateEntityRegistryEntry,
  removeEntityRegistryEntry,
} from "../../../data/entity_registry";
import { showConfirmationDialog } from "../../../dialogs/confirmation/show-dialog-confirmation";

class DialogEntityRegistryDetail extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _name!: string;
  @property() private _platform!: string;
  @property() private _entityId!: string;
  @property() private _disabledBy!: string | null;
  @property() private _error?: string;
  @property() private _params?: EntityRegistryDetailDialogParams;
  @property() private _submitting?: boolean;
  private _origEntityId!: string;

  public async showDialog(
    params: EntityRegistryDetailDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._name = this._params.entry.name || "";
    this._platform = this._params.entry.platform;
    this._origEntityId = this._params.entry.entity_id;
    this._entityId = this._params.entry.entity_id;
    this._disabledBy = this._params.entry.disabled_by;
    await this.updateComplete;
  }

  protected render(): TemplateResult | void {
    if (!this._params) {
      return html``;
    }
    const entry = this._params.entry;
    const stateObj: HassEntity | undefined = this.hass.states[entry.entity_id];
    const invalidDomainUpdate =
      computeDomain(this._entityId.trim()) !==
      computeDomain(this._params.entry.entity_id);

    return html`
      <ha-paper-dialog
        with-backdrop
        opened
        @opened-changed="${this._openedChanged}"
      >
        <h2>
          ${stateObj
            ? computeStateName(stateObj)
            : entry.name || entry.entity_id}
        </h2>
        <paper-dialog-scrollable>
          ${!stateObj
            ? html`
                <div>
                  ${this.hass!.localize(
                    "ui.panel.config.entity_registry.editor.unavailable"
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
              .label=${this.hass.localize("ui.dialogs.more_info_settings.name")}
              .placeholder=${stateObj ? computeStateName(stateObj) : ""}
              .disabled=${this._submitting}
            ></paper-input>
            <paper-input
              .value=${this._entityId}
              @value-changed=${this._entityIdChanged}
              .label=${this.hass.localize(
                "ui.dialogs.more_info_settings.entity_id"
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
                      "ui.panel.config.entity_registry.editor.enabled_label"
                    )}
                  </div>
                  <div class="secondary">
                    ${this._disabledBy && this._disabledBy !== "user"
                      ? this.hass.localize(
                          "ui.panel.config.entity_registry.editor.enabled_cause",
                          "cause",
                          this.hass.localize(
                            `config_entry.disabled_by.${this._disabledBy}`
                          )
                        )
                      : ""}
                    ${this.hass.localize(
                      "ui.panel.config.entity_registry.editor.enabled_description"
                    )}
                    <br />Note: this might not work yet with all integrations.
                  </div>
                </div>
              </ha-switch>
            </div>
          </div>
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <mwc-button
            class="warning"
            @click="${this._confirmDeleteEntry}"
            .disabled=${this._submitting}
          >
            ${this.hass.localize(
              "ui.panel.config.entity_registry.editor.delete"
            )}
          </mwc-button>
          <mwc-button
            @click="${this._updateEntry}"
            .disabled=${invalidDomainUpdate || this._submitting}
          >
            ${this.hass.localize(
              "ui.panel.config.entity_registry.editor.update"
            )}
          </mwc-button>
        </div>
      </ha-paper-dialog>
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
      this._params = undefined;
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
      this._params = undefined;
    } finally {
      this._submitting = false;
    }
  }

  private async _confirmDeleteEntry(): Promise<void> {
    showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.entity_registry.editor.confirm_delete"
      ),
      text: this.hass.localize(
        "ui.panel.config.entity_registry.editor.confirm_delete2",
        "platform",
        this._platform
      ),
      confirm: () => this._deleteEntry(),
    });
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!(ev.detail as any).value) {
      this._params = undefined;
    }
  }
  private _disabledByChanged(ev: Event): void {
    this._disabledBy = (ev.target as HaSwitch).checked ? null : "user";
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-paper-dialog {
          min-width: 400px;
          max-width: 450px;
        }
        .form {
          padding-bottom: 24px;
        }
        mwc-button.warning {
          margin-right: auto;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-entity-registry-detail": DialogEntityRegistryDetail;
  }
}

customElements.define(
  "dialog-entity-registry-detail",
  DialogEntityRegistryDetail
);
