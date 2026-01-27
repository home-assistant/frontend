import { mdiClose } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { isServiceLoaded } from "../../common/config/is_service_loaded";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { supportsFeature } from "../../common/entity/supports-feature";
import type { EntityRegistryDisplayEntry } from "../../data/entity/entity_registry";
import { extractApiErrorMessage } from "../../data/hassio/common";
import {
  type MediaPlayerEntity,
  MediaPlayerEntityFeature,
  mediaPlayerJoin,
  mediaPlayerUnjoin,
  mediaPlayerGetGroupablePlayers,
} from "../../data/media-player";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "../ha-alert";
import "../ha-button";
import "../ha-dialog";
import "../ha-dialog-header";
import "../ha-spinner";
import "./ha-media-player-toggle";
import type { JoinMediaPlayersDialogParams } from "./show-join-media-players-dialog";

@customElement("dialog-join-media-players")
class DialogJoinMediaPlayers extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _entityId?: string;

  @state() private _groupMembers!: string[];

  @state() private _selectedEntities!: string[];

  @state() private _joinableMembers?: string[];

  @state() private _loading = false;

  @state() private _submitting?: boolean;

  @state() private _error?: string;

  public async showDialog(params: JoinMediaPlayersDialogParams): Promise<void> {
    this._entityId = params.entityId;
    this._loading = true;

    const stateObj = this.hass.states[params.entityId] as
      | MediaPlayerEntity
      | undefined;

    this._groupMembers =
      stateObj?.attributes.group_members?.filter(
        (entityId) => entityId !== params.entityId
      ) || [];

    this._selectedEntities = this._groupMembers;

    try {
      if (isServiceLoaded(this.hass, "media_player", "get_groupable_players")) {
        try {
          const joinableMembers = await mediaPlayerGetGroupablePlayers(
            this.hass,
            params.entityId
          );
          if (this._entityId === params.entityId) {
            this._joinableMembers = joinableMembers;
            this._error = undefined;
          }
        } catch (_err) {
          if (this._entityId === params.entityId) {
            this._joinableMembers = undefined;
            this._error = this.hass.localize(
              "ui.card.media_player.groupable_players_load_error"
            );
          }
        }
      } else {
        this._joinableMembers = undefined;
      }
    } finally {
      if (this._entityId === params.entityId) {
        this._loading = false;
      }
    }
  }

  public closeDialog() {
    this._entityId = undefined;
    this._selectedEntities = [];
    this._groupMembers = [];
    this._joinableMembers = undefined;
    this._loading = false;
    this._submitting = false;
    this._error = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._entityId) {
      return nothing;
    }

    const entityId = this._entityId;
    const stateObj = this.hass.states[entityId] as HassEntity | undefined;
    const name = (stateObj && computeStateName(stateObj)) || entityId;

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        flexContent
        .heading=${name}
        @closed=${this.closeDialog}
      >
        <ha-dialog-header show-border slot="heading">
          <ha-icon-button
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
            dialogAction="close"
            slot="navigationIcon"
          ></ha-icon-button>
          <span slot="title"
            >${this.hass.localize("ui.card.media_player.media_players")}</span
          >
          <ha-button
            appearance="plain"
            slot="actionItems"
            @click=${this._selectAll}
          >
            ${this.hass.localize("ui.card.media_player.select_all")}
          </ha-button>
        </ha-dialog-header>
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing}
        <div class="content">
          <ha-media-player-toggle
            .hass=${this.hass}
            .entityId=${entityId}
            checked
            disabled
          ></ha-media-player-toggle>
          ${this._loading
            ? html`<div class="loading" role="status" aria-live="polite">
                <ha-spinner></ha-spinner>
                <p>
                  ${this.hass.localize("ui.card.media_player.loading_members")}
                </p>
              </div>`
            : this._mediaPlayerEntities(this.hass.entities).map(
                (entity) =>
                  html`<ha-media-player-toggle
                    .hass=${this.hass}
                    .entityId=${entity.entity_id}
                    .checked=${this._selectedEntities.includes(
                      entity.entity_id
                    )}
                    @change=${this._handleSelectedChange}
                  ></ha-media-player-toggle>`
              )}
        </div>
        <ha-button
          appearance="plain"
          slot="secondaryAction"
          @click=${this.closeDialog}
        >
          ${this.hass.localize("ui.common.cancel")}
        </ha-button>
        <ha-button
          .disabled=${!!this._submitting}
          slot="primaryAction"
          @click=${this._submit}
        >
          ${this.hass.localize("ui.common.apply")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _mediaPlayerEntities = (
    entities: Record<string, EntityRegistryDisplayEntry>
  ) => {
    if (!this._entityId) {
      return [];
    }

    // If joinable members were loaded from service, use those
    if (this._joinableMembers !== undefined) {
      return this._joinableMembers
        .filter((entityId) => entityId in entities)
        .map((entityId) => entities[entityId]);
    }

    const currentPlatform = this.hass.entities[this._entityId]?.platform;

    if (!currentPlatform) {
      return [];
    }

    return Object.values(entities).filter((entity) => {
      if (entity.entity_id === this._entityId) {
        return false;
      }
      if (computeDomain(entity.entity_id) !== "media_player") {
        return false;
      }
      if (this.hass.entities[entity.entity_id]?.platform !== currentPlatform) {
        return false;
      }
      if (
        !this.hass.states[entity.entity_id] ||
        !supportsFeature(
          this.hass.states[entity.entity_id],
          MediaPlayerEntityFeature.GROUPING
        )
      ) {
        return false;
      }
      return true;
    });
  };

  private _selectAll() {
    this._selectedEntities = this._mediaPlayerEntities(this.hass.entities).map(
      (entity) => entity.entity_id
    );
  }

  private _handleSelectedChange(ev) {
    const selectedEntities = this._selectedEntities.filter(
      (entityId) => entityId !== ev.target.entityId
    );
    if (ev.target.checked) {
      selectedEntities.push(ev.target.entityId);
    }
    this._selectedEntities = selectedEntities;
  }

  private async _submit(): Promise<void> {
    if (!this._entityId) {
      return;
    }

    this._error = undefined;
    this._submitting = true;
    try {
      // If media is already playing
      await mediaPlayerJoin(this.hass, this._entityId, this._selectedEntities);
      await Promise.all(
        this._groupMembers
          .filter((entityId) => !this._selectedEntities.includes(entityId))
          .map((entityId) => mediaPlayerUnjoin(this.hass, entityId))
      );
      this.closeDialog();
    } catch (err) {
      this._error = extractApiErrorMessage(err);
    }
    this._submitting = false;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        .content {
          display: flex;
          flex-direction: column;
          row-gap: var(--ha-space-4);
        }

        ha-dialog-header ha-button {
          margin: 6px;
          display: block;
        }

        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--ha-space-8) 0;
          gap: var(--ha-space-4);
        }

        .loading p {
          margin: 0;
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-join-media-players": DialogJoinMediaPlayers;
  }
}
