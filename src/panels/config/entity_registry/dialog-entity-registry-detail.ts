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
import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-item/paper-icon-item";
import "@polymer/paper-item/paper-item-body";

import "../../../components/ha-icon";
import domainIcon from "../../../common/entity/domain_icon";
import stateIcon from "../../../common/entity/state_icon";
import { computeEntityRegistryName } from "../../../data/entity_registry";

import { EntityRegistryDetailDialogParams } from "./show-dialog-entity-registry-detail";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import computeDomain from "../../../common/entity/compute_domain";
import { HassEntity } from "home-assistant-js-websocket";
import computeStateName from "../../../common/entity/compute_state_name";

interface MatchingEntityEntry {
  entityId: string;
  change: boolean;
  newEntityId: string;
  name: string;
  newName: string;
}

class DialogEntityRegistryDetail extends LitElement {
  public hass!: HomeAssistant;
  private _name!: string;
  private _entityId!: string;
  private _originalName!: string;
  private _originalEntityId!: string;
  private _error?: string;
  private _params?: EntityRegistryDetailDialogParams;
  private _matchingEntities?: MatchingEntityEntry[];
  private _submitting?: boolean;

  static get properties(): PropertyDeclarations {
    return {
      _error: {},
      _name: {},
      _entityId: {},
      _params: {},
      _matchingEntities: {},
    };
  }

  public async showDialog(
    params: EntityRegistryDetailDialogParams
  ): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._name = this._params.entry.name || "";
    this._originalName = this._params.entry.name ||
      computeEntityRegistryName(this.hass!, this._params.entry);
    this._entityId = this._params.entry.entity_id;
    this._originalEntityId = this._entityId;
    this._matchingEntities = this._params.matchingEntities.map((entry) => {
      return {
        entityId: entry.entity_id,
        change: true,
        newEntityId: entry.entity_id,
        name: computeEntityRegistryName(this.hass!, entry),
        newName: computeEntityRegistryName(this.hass!, entry),
      };
    });
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
      <paper-dialog
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
            ${this._matchingEntities.map((matchingEntity) => {
              const state = this.hass!.states[matchingEntity.entityId];
              return html`
                <paper-checkbox
                  checked
                  @click=${this._checkboxChanged}
                  .entry=${matchingEntity}
                >
                  <paper-icon-item>
                    <ha-icon
                      slot="item-icon"
                      .icon=${state
                        ? stateIcon(state)
                        : domainIcon(computeDomain(matchingEntity.entityId))}
                    ></ha-icon>
                    <paper-item-body two-line>
                      <div class="name">
                        ${matchingEntity.newName}
                      </div>
                      <div class="secondary entity-id">
                        ${matchingEntity.newEntityId}
                      </div>
                    </paper-item-body>
                    <div class="platform">${matchingEntity.platform}</div>
                  </paper-icon-item>
                </paper-checkbox>
              `;
            })}
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
      </paper-dialog>
    `;
  }

  private _updateMatchingEntry(mee: MatchingEntityEntry): MatchingEntityEntry {
    if (mee.change) {
      if (this._name.trim() || mee.name !== mee.newName) {
        mee.newName = mee.name.replace(this._originalName, this._name.trim());
      }
      if (this._entityId.trim() !== this._originalEntityId) {
        const entityIdPattern = this._originalEntityId.split(".").pop();
        mee.newEntityId = mee.entityId.replace(
          entityIdPattern,
          this._entityId.split(".").pop()
        );
      }
    } else {
      mee.newName = mee.name;
      mee.newEntityId = mee.entityId;
    }
    return mee;
  }

  private _checkboxChanged(ev: any): void {
    ev.currentTarget.entry.change = !ev.currentTarget.entry.change;
    this._matchingEntities = this._matchingEntities.map(
      this._updateMatchingEntry.bind(this)
    );
  }

  private _nameChanged(ev: PolymerChangedEvent<string>): void {
    this._error = undefined;
    this._name = ev.detail.value;
    this._matchingEntities = this._matchingEntities.map(
      this._updateMatchingEntry.bind(this)
    );
  }

  private _entityIdChanged(ev: PolymerChangedEvent<string>): void {
    this._error = undefined;
    this._entityId = ev.detail.value;
    this._matchingEntities = this._matchingEntities.map(
      this._updateMatchingEntry.bind(this)
    );
  }

  private async _updateEntry(): Promise<void> {
    this._submitting = true;
    try {
      for (let x = 0; x < this._matchingEntities.length; ++x) {
        const entry = this._matchingEntities[x];
        if (entry.change) {
          await this._params.updateEntry(entry.entityId, {
            name: entry.newName,
            new_entity_id: entry.newEntityId,
          });
        }
      }
      await this._params!.updateEntry(this._originalEntityId, {
        name: this._name.trim() || null,
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
        mwc-button.warning {
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
