import type { ContextType } from "@lit/context";
import { mdiClose } from "@mdi/js";
import type { HassEntities } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { consume } from "../../common/decorators/consume";
import {
  consumeLocalize,
  preserveUnchangedEntityStatesRecord,
} from "../../common/decorators/consume-context-entry";
import { transform } from "../../common/decorators/transform";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { supportsFeature } from "../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../common/translations/localize";
import { apiContext, entitiesContext, statesContext } from "../../data/context";
import { extractApiErrorMessage } from "../../data/hassio/common";
import {
  type MediaPlayerEntity,
  MediaPlayerEntityFeature,
  mediaPlayerJoin,
  mediaPlayerUnjoin,
} from "../../data/media-player";
import { haStyleDialog } from "../../resources/styles";
import "../ha-alert";
import "../ha-button";
import "../ha-dialog-footer";
import "../ha-dialog-header";
import "../ha-dialog";
import "./ha-media-player-toggle";
import type { JoinMediaPlayersDialogParams } from "./show-join-media-players-dialog";

@customElement("dialog-join-media-players")
class DialogJoinMediaPlayers extends LitElement {
  @state()
  @consume({ context: statesContext, subscribe: true })
  @transform<HassEntities, HassEntities>({
    transformer: function (this: DialogJoinMediaPlayers, states) {
      const mediaPlayers: HassEntities = {};
      Object.entries(states ?? {}).forEach(([entityId, stateObj]) => {
        if (computeDomain(entityId) === "media_player") {
          mediaPlayers[entityId] = stateObj;
        }
      });
      return preserveUnchangedEntityStatesRecord(this._states, mediaPlayers);
    },
  })
  private _states: HassEntities = {};

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  private _entities!: ContextType<typeof entitiesContext>;

  @state() @consumeLocalize() private _localize!: LocalizeFunc;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state() private _entityId?: string;

  @state() private _groupMembers!: string[];

  @state() private _selectedEntities!: string[];

  @state() private _submitting?: boolean;

  @state() private _error?: string;

  @state() private _open = false;

  public showDialog(params: JoinMediaPlayersDialogParams): void {
    this._entityId = params.entityId;
    this._open = true;
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (!changedProps.has("_entityId") || !this._entityId) {
      return;
    }
    const entityId = this._entityId;
    const stateObj = this._states[entityId] as MediaPlayerEntity | undefined;

    this._groupMembers =
      stateObj?.attributes.group_members?.filter((id) => id !== entityId) || [];

    this._selectedEntities = this._groupMembers;
  }

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._open = false;
    this._entityId = undefined;
    this._selectedEntities = [];
    this._groupMembers = [];
    this._submitting = false;
    this._error = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._entityId) {
      return nothing;
    }

    const entityId = this._entityId;
    return html`
      <ha-dialog .open=${this._open} flexcontent @closed=${this._dialogClosed}>
        <ha-dialog-header show-border slot="header">
          <ha-icon-button
            .label=${this._localize("ui.common.close")}
            .path=${mdiClose}
            data-dialog="close"
            slot="navigationIcon"
          ></ha-icon-button>
          <span slot="title"
            >${this._localize("ui.card.media_player.media_players")}</span
          >
          <ha-button
            appearance="plain"
            slot="actionItems"
            @click=${this._selectAll}
          >
            ${this._localize("ui.card.media_player.select_all")}
          </ha-button>
        </ha-dialog-header>
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing
        }
        <div class="content">
          <ha-media-player-toggle
            .entityId=${entityId}
            checked
            disabled
          ></ha-media-player-toggle>
          ${this._mediaPlayerEntities(
            entityId,
            this._entities,
            this._states
          ).map(
            (id) =>
              html`<ha-media-player-toggle
                .entityId=${id}
                .checked=${this._selectedEntities.includes(id)}
                @change=${this._handleSelectedChange}
              ></ha-media-player-toggle>`
          )}
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button
            appearance="plain"
            slot="secondaryAction"
            @click=${this.closeDialog}
          >
            ${this._localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            .disabled=${!!this._submitting}
            slot="primaryAction"
            @click=${this._submit}
          >
            ${this._localize("ui.common.apply")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _mediaPlayerEntities = memoizeOne(
    (
      entityId: string,
      entities: ContextType<typeof entitiesContext>,
      states: HassEntities
    ): string[] => {
      const currentPlatform = entities?.[entityId]?.platform;

      if (!currentPlatform) {
        return [];
      }

      return Object.values(entities)
        .filter((entity) => {
          if (entity.entity_id === entityId) {
            return false;
          }
          if (computeDomain(entity.entity_id) !== "media_player") {
            return false;
          }
          if (entity.platform !== currentPlatform) {
            return false;
          }
          const stateObj = states[entity.entity_id];
          return (
            !!stateObj &&
            supportsFeature(stateObj, MediaPlayerEntityFeature.GROUPING)
          );
        })
        .map((entity) => entity.entity_id);
    }
  );

  private _selectAll() {
    if (!this._entityId) {
      return;
    }
    this._selectedEntities = this._mediaPlayerEntities(
      this._entityId,
      this._entities,
      this._states
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
      await mediaPlayerJoin(
        this._api.callService,
        this._entityId,
        this._selectedEntities
      );
      await Promise.all(
        this._groupMembers
          .filter((entityId) => !this._selectedEntities.includes(entityId))
          .map((entityId) => mediaPlayerUnjoin(this._api.callService, entityId))
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
          padding-top: var(--ha-space-6);
          row-gap: var(--ha-space-4);
        }

        ha-dialog-header ha-button {
          margin: 6px;
          display: block;
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
