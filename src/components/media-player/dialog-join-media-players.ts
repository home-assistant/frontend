import type { ContextType } from "@lit/context";
import { mdiClose } from "@mdi/js";
import type { HassEntities } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { deepEqual } from "../../common/util/deep-equal";
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
    this._error = undefined;
    this._open = true;
  }

  protected willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (
      !this._entityId ||
      (!changedProps.has("_entityId") && !changedProps.has("_states"))
    ) {
      return;
    }
    const entityId = this._entityId;
    const stateObj = this._states[entityId] as MediaPlayerEntity | undefined;
    const groupMembers =
      stateObj?.attributes.group_members?.filter((id) => id !== entityId) || [];
    const opened = changedProps.has("_entityId");

    if (!opened && deepEqual(groupMembers, this._groupMembers)) {
      return;
    }
    this._groupMembers = groupMembers;
    if (opened || !this._submitting) {
      this._selectedEntities = groupMembers;
    }
  }

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._open = false;
    this._entityId = undefined;
    this._selectedEntities = [];
    this._groupMembers = [];
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
            .disabled=${!!this._submitting}
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
            show-volume
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
                .disabled=${!!this._submitting}
                .showVolume=${this._groupMembers.includes(id)}
                @change=${this._handleSelectedChange}
              ></ha-media-player-toggle>`
          )}
        </div>
        <ha-dialog-footer slot="footer">
          <ha-button slot="primaryAction" @click=${this.closeDialog}>
            ${this._localize("ui.common.close")}
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
    this._applySelection([
      ...new Set([
        ...this._selectedEntities,
        ...this._mediaPlayerEntities(
          this._entityId,
          this._entities,
          this._states
        ),
      ]),
    ]);
  }

  private _handleSelectedChange(ev) {
    const selectedEntities = this._selectedEntities.filter(
      (entityId) => entityId !== ev.target.entityId
    );
    if (ev.target.checked) {
      selectedEntities.push(ev.target.entityId);
    }
    this._applySelection(selectedEntities);
  }

  private async _applySelection(selectedEntities: string[]): Promise<void> {
    if (!this._entityId || this._submitting) {
      return;
    }

    const previous = this._selectedEntities;
    const hasAdded = selectedEntities.some((id) => !previous.includes(id));
    const removed = previous.filter((id) => !selectedEntities.includes(id));

    this._selectedEntities = selectedEntities;
    this._error = undefined;
    // Stays set if the dialog closes, so a reopened dialog can't send changes
    // while this call is still running.
    this._submitting = true;
    try {
      if (hasAdded) {
        // Send every member: some integrations form a new group with only the
        // players they receive when the target isn't the group leader.
        await mediaPlayerJoin(
          this._api.callService,
          this._entityId,
          selectedEntities
        );
      }
      await Promise.all(
        removed.map((id) => mediaPlayerUnjoin(this._api.callService, id))
      );
    } catch (err) {
      this._selectedEntities = this._groupMembers;
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
