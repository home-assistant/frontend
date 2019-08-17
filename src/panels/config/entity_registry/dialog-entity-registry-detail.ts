import {
  LitElement,
  html,
  css,
  PropertyDeclarations,
  CSSResult,
  TemplateResult,
} from "lit-element";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-toggle-button/paper-toggle-button";

import "../../../components/dialog/ha-paper-dialog";

import { EntityRegistryDetailDialogParams } from "./show-dialog-entity-registry-detail";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import computeDomain from "../../../common/entity/compute_domain";
import { HassEntity } from "home-assistant-js-websocket";
import computeStateName from "../../../common/entity/compute_state_name";

class DialogEntityRegistryDetail extends LitElement {
  public hass!: HomeAssistant;
  private _name!: string;
  private _entityId!: string;
  private _disabledBy!: string | null;
  private _error?: string;
  private _params?: EntityRegistryDetailDialogParams;
  private _submitting?: boolean;

  static get properties(): PropertyDeclarations {
    return {
      _error: {},
      _name: {},
      _entityId: {},
      _params: {},
    };
  }

  public async showDialog(
    params: EntityRegistryDetailDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._name = this._params.entry.name || "";
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
        <h2>${entry.entity_id}</h2>
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
              <paper-toggle-button
                .checked=${this._disabledBy}
                @checked-changed=${this._disabledByChanged}
              >
                <div>
                  Disable
                  entity${this._disabledBy && this._disabledBy !== "user"
                    ? html`
                        – Disabled by ${this._disabledBy}
                      `
                    : ""}
                </div>
                <div class="secondary">
                  Disabled entities will not be added to Home Assistant.
                </div>
              </paper-toggle-button>
            </div>
          </div>
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <mwc-button
            class="warning"
            @click="${this._deleteEntry}"
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
      await this._params!.updateEntry({
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
      if (await this._params!.removeEntry()) {
        this._params = undefined;
      }
    } finally {
      this._submitting = false;
    }
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!(ev.detail as any).value) {
      this._params = undefined;
    }
  }
  private _disabledByChanged(ev: PolymerChangedEvent<boolean>): void {
    this._disabledBy = ev.detail.value ? "user" : null;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-paper-dialog {
          min-width: 400px;
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
