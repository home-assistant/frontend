import type { CSSResultGroup } from "lit";
import { mdiClose } from "@mdi/js";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HassEntity } from "home-assistant-js-websocket";
import { fireEvent } from "../../common/dom/fire_event";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../types";
import "../ha-dialog";
import "../ha-button";
import "../ha-dialog-header";
import "../entity/ha-entities-picker";
import type { MediaPlayerGroupDialogParams } from "./show-media-player-group-dialog";
import { computeStateName } from "../../common/entity/compute_state_name";
import { supportsFeature } from "../../common/entity/supports-feature";
import {
  MediaPlayerEntityFeature,
  mediaPlayerJoin,
} from "../../data/media-player";

const includeDomains = ["media_player"];

@customElement("dialog-media-player-group")
class DialogMediaPlayerGroup extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _entityId?: string;

  @state() private _groupMembers!: string[];

  @state() private _submitting?: boolean;

  public showDialog(params: MediaPlayerGroupDialogParams): void {
    this._entityId = params.entityId;

    const stateObj = this.hass.states[params.entityId] as
      | (HassEntity & { attributes: { group_members?: string[] } })
      | undefined;
    this._groupMembers =
      stateObj?.attributes.group_members?.filter(
        (entityId) => entityId !== params.entityId
      ) || [];
  }

  public closeDialog() {
    this._entityId = undefined;
    this._groupMembers = [];
    this._submitting = false;
    this.classList.remove("opened");
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
        @opened=${this._dialogOpened}
      >
        <ha-dialog-header show-border slot="heading">
          <span slot="title"
            >${this.hass.localize(
              "ui.card.media_player.group_media_players"
            )}</span
          >
          <ha-icon-button
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
            dialogAction="close"
            slot="actionItems"
          ></ha-icon-button>
        </ha-dialog-header>
        <ha-entity-picker
          .hass=${this.hass}
          .value=${this._entityId}
          disabled
          required
          hide-clear-icon
          .label=${this.hass.localize("ui.card.media_player.group_member")}
        >
        </ha-entity-picker>
        <ha-entities-picker
          .hass=${this.hass}
          .value=${this._groupMembers}
          .autofocus=${true}
          .includeDomains=${includeDomains}
          .entityFilter=${this._filterEntities}
          .pickedEntityLabel=${this.hass.localize(
            "ui.card.media_player.group_member"
          )}
          .pickEntityLabel=${this.hass.localize(
            "ui.card.media_player.group_member"
          )}
          @value-changed=${this._groupMembersChanged}
        >
        </ha-entities-picker>
        <ha-button
          .disabled=${this._submitting}
          slot="primaryAction"
          @click=${this._submit}
        >
          ${this.hass.localize("ui.common.save")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _dialogOpened() {
    this.classList.add("opened");
  }

  private _groupMembersChanged(ev: ValueChangedEvent<string[]>) {
    this._groupMembers = ev.detail.value;
  }

  // NOTE: We could filter by matching platforms as well, if groups are not
  // interoperable
  private _filterEntities = (entity: HassEntity): boolean =>
    entity.entity_id !== this._entityId &&
    supportsFeature(entity, MediaPlayerEntityFeature.GROUPING);

  private async _submit(): Promise<void> {
    if (!this._entityId) {
      return;
    }

    this._submitting = true;
    try {
      await mediaPlayerJoin(this.hass, this._entityId, this._groupMembers);
      this.closeDialog();
    } catch (_e) {
      // TODO
    }
    this._submitting = false;
  }

  static get styles(): CSSResultGroup {
    return [haStyleDialog];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-media-player-group": DialogMediaPlayerGroup;
  }
}
