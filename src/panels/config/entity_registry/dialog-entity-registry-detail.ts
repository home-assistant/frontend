import {
  LitElement,
  html,
  css,
  PropertyDeclarations,
  CSSResult,
  TemplateResult,
} from "lit-element";
import "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-input/paper-input";

import { EntityRegistryDetailDialogParams } from "./show-dialog-entity-registry-detail";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/ha-style";
import { HomeAssistant } from "../../../types";
import computeDomain from "../../../common/entity/compute_domain";
import { HassEntity } from "home-assistant-js-websocket";
import computeStateName from "../../../common/entity/compute_state_name";

class DialogEntityRegistryDetail extends LitElement {
  public hass!: HomeAssistant;
  private _name!: string;
  private _entityId!: string;
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
    this._name = this._params.entry.name;
    this._entityId = this._params.entry.entity_id;
    await this.updateComplete;
  }

  protected render(): TemplateResult | void {
    if (!this._params) {
      return html``;
    }
    const entry = this._params.entry;
    const stateObj: HassEntity | undefined = this.hass.states[entry.entity_id];
    const invalidDomainUpdate =
      computeDomain(this._entityId) !==
      computeDomain(this._params.entry.entity_id);

    return html`
      <paper-dialog
        with-backdrop
        opened
        @opened-changed="${this._openedChanged}"
      >
        <h2>${entry.entity_id}</h2>
        <paper-dialog-scrollable>
          ${!stateObj
            ? html`
                <div>This entity is not currently available.</div>
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
            ></paper-input>
            <paper-input
              .value=${this._entityId}
              @value-changed=${this._entityIdChanged}
              .label=${this.hass.localize(
                "ui.dialogs.more_info_settings.entity_id"
              )}
              error-message="Domain needs to stay the same"
              .invalid=${invalidDomainUpdate}
            ></paper-input>
          </div>
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <paper-button
            class="danger"
            @click="${this._deleteEntry}"
            .disabled=${this._submitting}
          >
            DELETE
          </paper-button>
          <paper-button
            @click="${this._updateEntry}"
            .disabled=${invalidDomainUpdate || this._submitting}
          >
            UPDATE
          </paper-button>
        </div>
      </paper-dialog>
    `;
  }

  private _nameChanged(ev: PolymerChangedEvent<string>) {
    this._error = undefined;
    this._name = ev.detail.value;
  }

  private _entityIdChanged(ev: PolymerChangedEvent<string>) {
    this._error = undefined;
    this._entityId = ev.detail.value;
  }

  private async _updateEntry() {
    try {
      await this._params!.updateEntry({
        name: this._name,
        new_entity_id: this._entityId,
      });
      this._params = undefined;
    } catch (err) {
      this._error = err;
    }
  }

  private async _deleteEntry() {
    if (await this._params!.removeEntry()) {
      this._params = undefined;
    }
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!(ev.detail as any).value) {
      this._params = undefined;
    }
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        paper-dialog {
          min-width: 400px;
        }
        .form {
          padding-bottom: 24px;
        }
        paper-button {
          font-weight: 500;
        }
        paper-button.danger {
          font-weight: 500;
          color: var(--google-red-500);
          margin-left: -12px;
          margin-right: auto;
        }
        .error {
          color: var(--google-red-500);
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
