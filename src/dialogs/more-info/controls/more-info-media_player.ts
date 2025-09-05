import {
  mdiLoginVariant,
  mdiMusicNote,
  mdiPlayBoxMultiple,
  mdiSpeakerMultiple,
  mdiVolumeHigh,
  mdiVolumeMinus,
  mdiVolumeOff,
  mdiVolumePlus,
} from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { formatDurationDigital } from "../../../common/datetime/format_duration";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-select";
import "../../../components/ha-slider";
import "../../../components/ha-button";
import "../../../components/ha-svg-icon";
import "../../../components/chips/ha-chip-set";
import "../../../components/chips/ha-filter-chip";
import { showMediaBrowserDialog } from "../../../components/media-player/show-media-browser-dialog";
import { showJoinMediaPlayersDialog } from "../../../components/media-player/show-join-media-players-dialog";
import { isUnavailableState } from "../../../data/entity";
import type {
  MediaPickedEvent,
  MediaPlayerEntity,
} from "../../../data/media-player";
import {
  MediaPlayerEntityFeature,
  computeMediaControls,
  handleMediaControlClick,
  mediaPlayerPlayMedia,
} from "../../../data/media-player";
import type { HomeAssistant } from "../../../types";
import HassMediaPlayerEntity from "../../../util/hass-media-player-model";

@customElement("more-info-media_player")
class MoreInfoMediaPlayer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: MediaPlayerEntity;

  private _formateDuration(duration: number) {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    return formatDurationDigital(this.hass.locale, {
      hours,
      minutes,
      seconds,
    })!;
  }

  protected _renderVolumeControl() {
    if (!this.stateObj) {
      return nothing;
    }

    const supportsMute = supportsFeature(
      this.stateObj,
      MediaPlayerEntityFeature.VOLUME_MUTE
    );
    const supportsSliding = supportsFeature(
      this.stateObj,
      MediaPlayerEntityFeature.VOLUME_SET
    );

    return html` ${(supportsFeature(
      this.stateObj!,
      MediaPlayerEntityFeature.VOLUME_SET
    ) ||
      supportsFeature(this.stateObj!, MediaPlayerEntityFeature.VOLUME_STEP)) &&
    stateActive(this.stateObj!)
      ? html`
          <div class="volume">
            ${supportsMute
              ? html`
                  <ha-icon-button
                    .path=${this.stateObj.attributes.is_volume_muted
                      ? mdiVolumeOff
                      : mdiVolumeHigh}
                    .label=${this.hass.localize(
                      `ui.card.media_player.${
                        this.stateObj.attributes.is_volume_muted
                          ? "media_volume_unmute"
                          : "media_volume_mute"
                      }`
                    )}
                    @click=${this._toggleMute}
                  ></ha-icon-button>
                `
              : ""}
            ${supportsFeature(
              this.stateObj,
              MediaPlayerEntityFeature.VOLUME_STEP
            ) && !supportsSliding
              ? html`
                  <ha-icon-button
                    action="volume_down"
                    .path=${mdiVolumeMinus}
                    .label=${this.hass.localize(
                      "ui.card.media_player.media_volume_down"
                    )}
                    @click=${this._handleClick}
                  ></ha-icon-button>
                  <ha-icon-button
                    action="volume_up"
                    .path=${mdiVolumePlus}
                    .label=${this.hass.localize(
                      "ui.card.media_player.media_volume_up"
                    )}
                    @click=${this._handleClick}
                  ></ha-icon-button>
                `
              : nothing}
            ${supportsSliding
              ? html`
                  ${!supportsMute
                    ? html`<ha-svg-icon .path=${mdiVolumeHigh}></ha-svg-icon>`
                    : nothing}
                  <ha-slider
                    labeled
                    id="input"
                    .value=${Number(this.stateObj.attributes.volume_level) *
                    100}
                    @change=${this._selectedValueChanged}
                  ></ha-slider>
                `
              : nothing}
          </div>
        `
      : nothing}`;
  }

  protected _renderSourceControl() {
    if (!this.stateObj) {
      return nothing;
    }

    return html`${stateActive(this.stateObj) &&
    supportsFeature(this.stateObj, MediaPlayerEntityFeature.SELECT_SOURCE) &&
    this.stateObj.attributes.source_list?.length
      ? html`<ha-md-button-menu positioning="popover" class="source-input">
          <ha-assist-chip
            slot="trigger"
            .label=${this.stateObj.attributes.source ||
            this.hass.localize("ui.card.media_player.source")}
          >
            <ha-svg-icon slot="icon" .path=${mdiLoginVariant}></ha-svg-icon>
          </ha-assist-chip>
          ${this.stateObj.attributes.source_list!.map(
            (source) =>
              html`<ha-md-menu-item
                data-source=${source}
                keep-open
                @click=${this._handleSourceClick}
                @keydown=${this._handleSourceClick}
                .selected=${source === this.stateObj?.attributes.source}
              >
                ${source}
              </ha-md-menu-item>`
          )}
        </ha-md-button-menu>`
      : nothing}`;
  }

  protected _renderSoundMode() {
    return html` ${stateActive(this.stateObj!) &&
    supportsFeature(
      this.stateObj!,
      MediaPlayerEntityFeature.SELECT_SOUND_MODE
    ) &&
    this.stateObj!.attributes.sound_mode_list?.length
      ? html`
          <ha-md-button-menu positioning="popover" class="sound-input">
            <ha-assist-chip
              slot="trigger"
              .label=${this.stateObj!.attributes.sound_mode ||
              this.hass.localize("ui.card.media_player.sound_mode")}
            >
              <ha-svg-icon slot="icon" .path=${mdiMusicNote}></ha-svg-icon>
            </ha-assist-chip>
            ${this.stateObj!.attributes.sound_mode_list!.map(
              (mode) =>
                html`<ha-md-menu-item
                  data-mode=${mode}
                  keep-open
                  @click=${this._handleSoundeModeClick}
                  @keydown=${this._handleSoundeModeClick}
                  .selected=${mode === this.stateObj?.attributes.sound_mode}
                >
                  ${this.hass.formatEntityAttributeValue(
                    this.stateObj!,
                    "sound_mode",
                    mode
                  )}
                </ha-md-menu-item>`
            )}
          </ha-md-button-menu>
        `
      : nothing}`;
  }

  protected _renderGrouping() {
    if (!this.stateObj) {
      return nothing;
    }
    const stateObj = this.stateObj;
    const groupMembers = stateObj.attributes.group_members?.length;

    return html`${!isUnavailableState(stateObj.state) &&
    supportsFeature(stateObj, MediaPlayerEntityFeature.GROUPING)
      ? html`
          <ha-button
            @click=${this._showGroupMediaPlayers}
            appearance="plain"
            variant="neutral"
            size="small"
          >
            <ha-svg-icon .path=${mdiSpeakerMultiple} slot="start"></ha-svg-icon>
            ${groupMembers && groupMembers > 1
              ? html`<span class="badge">
                  ${stateObj.attributes.group_members?.length || 4}
                </span>`
              : nothing}
            ${this.hass.localize("ui.card.media_player.join")}
          </ha-button>
        `
      : nothing}`;
  }

  protected _renderEmptyCover(title: string, icon?: string) {
    return html`
      <div class="cover-container">
        <div class="cover-image empty-cover" role="img" aria-label=${title}>
          ${icon ? html`<ha-svg-icon .path=${icon}></ha-svg-icon>` : title}
        </div>
      </div>
    `;
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }

    if (isUnavailableState(this.stateObj.state)) {
      return this._renderEmptyCover(this.hass.formatEntityState(this.stateObj));
    }

    const stateObj = this.stateObj;
    const controls = computeMediaControls(stateObj, true);
    const coverUrl = stateObj.attributes.entity_picture || "";
    const duration = stateObj.attributes.media_duration;
    const durationFormated = stateObj.attributes.media_duration
      ? this._formateDuration(stateObj.attributes.media_duration)
      : 0;
    const playerObj = new HassMediaPlayerEntity(this.hass, this.stateObj);
    const position = Math.floor(playerObj.currentProgress);
    const postionFormated = this._formateDuration(position);
    const primaryTitle = playerObj.primaryTitle;
    const secondaryTitle = playerObj.secondaryTitle;

    return html`
      ${coverUrl
        ? html`<div class="cover-container">
            <img
              class="cover-image${stateObj.state === "playing"
                ? " cover-image--playing"
                : ""}"
              src=${coverUrl}
              alt=${ifDefined(primaryTitle)}
            />
          </div>`
        : this._renderEmptyCover(
            this.hass.formatEntityState(this.stateObj),
            mdiMusicNote
          )}
      ${primaryTitle || secondaryTitle
        ? html`<div class="media-info-row">
            <div class="media-info">
              ${primaryTitle
                ? html`<div class="media-title">${primaryTitle}</div>`
                : nothing}
              ${secondaryTitle
                ? html`<div class="media-artist">${secondaryTitle}</div>`
                : nothing}
            </div>
            <div>
              ${!isUnavailableState(stateObj.state) &&
              supportsFeature(stateObj, MediaPlayerEntityFeature.BROWSE_MEDIA)
                ? html`
                    <ha-button
                      @click=${this._showBrowseMedia}
                      appearance="plain"
                      variant="neutral"
                      size="small"
                    >
                      <ha-svg-icon
                        .path=${mdiPlayBoxMultiple}
                        slot="start"
                      ></ha-svg-icon>
                      ${this.hass.localize("ui.card.media_player.browse_media")}
                    </ha-button>
                  `
                : nothing}
            </div>
          </div>`
        : nothing}
      ${duration && duration > 0
        ? html`
            <div class="position-bar">
              <ha-slider
                min="0"
                max=${duration}
                step="1"
                .value=${position}
                aria-label=${this.hass.localize(
                  "ui.card.media_player.track_position"
                )}
                @change=${this._handleMediaSeekChanged}
              ></ha-slider>
              <div class="position-info-row">
                <span class="position-time">${postionFormated}</span>
                <span class="duration-time">${durationFormated}</span>
              </div>
            </div>
          `
        : nothing}
      ${controls && controls.length > 0
        ? html`<div class="controls-row">
            <div class="side-control">
              ${["repeat_set", "media_previous_track"].map((action) => {
                const control = controls?.find((c) => c.action === action);
                return control
                  ? html`<ha-icon-button
                      action=${action}
                      @click=${this._handleClick}
                      .path=${control.icon}
                      .label=${this.hass.localize(
                        "ui.card.media_player.media_pause"
                      )}
                    >
                    </ha-icon-button>`
                  : nothing;
              })}
            </div>
            <div class="center-control">
              ${["media_play_pause", "media_pause", "media_play"].map(
                (action) => {
                  const control = controls?.find((c) => c.action === action);
                  return control
                    ? html`<ha-button
                        variant="brand"
                        appearance="filled"
                        size="medium"
                        action=${action}
                        @click=${this._handleClick}
                      >
                        <ha-svg-icon
                          .path=${control.icon}
                          .label=${this.hass.localize(
                            "ui.card.media_player.media_pause"
                          )}
                        ></ha-svg-icon>
                      </ha-button>`
                    : nothing;
                }
              )}
            </div>
            <div class="side-control">
              ${["media_next_track", "shuffle_set"].map((action) => {
                const control = controls?.find((c) => c.action === action);
                return control
                  ? html`<ha-icon-button
                      action=${action}
                      @click=${this._handleClick}
                      .path=${control.icon}
                      .label=${this.hass.localize(
                        "ui.card.media_player.media_pause"
                      )}
                    >
                    </ha-icon-button>`
                  : nothing;
              })}
              ${["turn_on", "turn_off"].map((action) => {
                const control = controls?.find((c) => c.action === action);
                return control
                  ? html`<ha-icon-button
                      action=${action}
                      @click=${this._handleClick}
                      .path=${control.icon}
                      .label=${this.hass.localize(
                        "ui.card.media_player.media_pause"
                      )}
                    >
                    </ha-icon-button>`
                  : nothing;
              })}
            </div>
          </div>`
        : nothing}
      ${this._renderVolumeControl()}

      <div class="bottom-controls">
        ${this._renderSourceControl()} ${this._renderSoundMode()}
        ${this._renderGrouping()}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 0;
    }

    .cover-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 320px;
      width: 100%;
    }

    .cover-image {
      width: 240px;
      height: 240px;
      max-width: 100%;
      max-height: 100%;
      object-fit: cover;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      transition:
        width 0.3s,
        height 0.3s;
    }

    .cover-image--playing {
      width: 320px;
      height: 320px;
    }

    .empty-cover {
      background-color: var(--disabled-color);
      font-size: 1.5em;
      color: var(--secondary-text-color);
    }

    .controls-row {
      --ha-button-height: 56px;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }

    .side-control {
      flex: 1 1 0;
      display: flex;
      justify-content: flex-end;
    }

    .side-control:last-child {
      justify-content: flex-start;
    }

    .center-control {
      flex: 0 0 auto;
      display: flex;
      justify-content: center;
    }

    .volume {
      direction: ltr;
    }

    .volume ha-slider,
    .position-bar ha-slider {
      width: 100%;
      --md-sys-color-primary: var(--disabled-color);
    }

    .source-input,
    .sound-input {
      direction: var(--direction);
    }

    .volume,
    .source-input,
    .sound-input {
      display: flex;
      align-items: center;
    }

    .badge {
      position: absolute;
      top: -6px;
      left: 24px;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 16px;
      min-width: 8px;
      border-radius: 10px;
      font-weight: var(--ha-font-weight-normal);
      font-size: var(--ha-font-size-xs);
      background-color: var(--accent-color);
      padding: 0 4px;
      color: var(--text-accent-color, var(--text-primary-color));
    }

    .position-bar {
      display: flex;
      flex-direction: column;
    }

    .position-info-row {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      color: var(--secondary-text-color);
      padding: 0 8px;
    }

    .source-input ha-chip {
      --ha-chip-selected-color: var(--primary-color);
      --ha-chip-text-color: var(--text-primary-color);
      --ha-chip-background-color: var(--card-background-color);
      --ha-chip-border-color: var(--primary-color);
    }

    .media-info-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin: 8px 0 8px 8px;
    }

    .media-title {
      font-size: 1.3em;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .media-artist {
      font-size: 1.1em;
      font-weight: 500;
    }

    .bottom-controls {
      display: flex;
      gap: 8px;
      justify-content: center;
    }
  `;

  private _handleClick(e: MouseEvent): void {
    handleMediaControlClick(
      this.hass!,
      this.stateObj!,
      (e.currentTarget as HTMLElement).getAttribute("action")!
    );
  }

  private _toggleMute() {
    this.hass!.callService("media_player", "volume_mute", {
      entity_id: this.stateObj!.entity_id,
      is_volume_muted: !this.stateObj!.attributes.is_volume_muted,
    });
  }

  private _selectedValueChanged(e: Event): void {
    this.hass!.callService("media_player", "volume_set", {
      entity_id: this.stateObj!.entity_id,
      volume_level: (e.target as any).value / 100,
    });
  }

  private _handleSourceClick(e: Event) {
    const source = (e.currentTarget as HTMLElement).getAttribute("data-source");
    if (!source || this.stateObj!.attributes.source === source) {
      return;
    }

    this.hass.callService("media_player", "select_source", {
      entity_id: this.stateObj!.entity_id,
      source,
    });
  }

  private _handleSoundeModeClick(e) {
    const mode = (e.currentTarget as HTMLElement).getAttribute("data-mode");
    if (!mode || this.stateObj?.attributes.sound_mode === mode) {
      return;
    }

    this.hass.callService("media_player", "select_sound_mode", {
      entity_id: this.stateObj!.entity_id,
      sound_mode: mode,
    });
  }

  private _showBrowseMedia(): void {
    showMediaBrowserDialog(this, {
      action: "play",
      entityId: this.stateObj!.entity_id,
      mediaPickedCallback: (pickedMedia: MediaPickedEvent) =>
        mediaPlayerPlayMedia(
          this.hass,
          this.stateObj!.entity_id,
          pickedMedia.item.media_content_id,
          pickedMedia.item.media_content_type
        ),
    });
  }

  private _showGroupMediaPlayers(): void {
    showJoinMediaPlayersDialog(this, {
      entityId: this.stateObj!.entity_id,
    });
  }

  private _handleMediaSeekChanged(e: Event): void {
    if (!this.stateObj) {
      return;
    }

    const newValue = (e.target as any).value;
    this.hass.callService("media_player", "media_seek", {
      entity_id: this.stateObj.entity_id,
      seek_position: newValue,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-media_player": MoreInfoMediaPlayer;
  }
}
