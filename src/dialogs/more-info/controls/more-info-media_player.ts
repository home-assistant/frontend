import {
  mdiLoginVariant,
  mdiMusicNote,
  mdiMusicNoteEighth,
  mdiPlayBoxMultiple,
  mdiSpeakerMultiple,
  mdiVolumeHigh,
  mdiVolumeMinus,
  mdiVolumeOff,
  mdiVolumePlus,
} from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { classMap } from "lit/directives/class-map";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { formatDurationDigital } from "../../../common/datetime/format_duration";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-select";
import "../../../components/ha-slider";
import "../../../components/ha-button";
import "../../../components/ha-svg-icon";
import { showMediaBrowserDialog } from "../../../components/media-player/show-media-browser-dialog";
import { showJoinMediaPlayersDialog } from "../../../components/media-player/show-join-media-players-dialog";
import { isUnavailableState } from "../../../data/entity";
import type {
  MediaPickedEvent,
  MediaPlayerEntity,
} from "../../../data/media-player";
import {
  computeMediaControls,
  handleMediaControlClick,
  MediaPlayerEntityFeature,
  mediaPlayerPlayMedia,
} from "../../../data/media-player";
import type { HomeAssistant } from "../../../types";
import HassMediaPlayerEntity from "../../../util/hass-media-player-model";
import "../../../components/ha-md-button-menu";
import "../../../components/chips/ha-assist-chip";
import "../../../components/ha-md-menu-item";
import "../../../components/ha-marquee-text";

@customElement("more-info-media_player")
class MoreInfoMediaPlayer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: MediaPlayerEntity;

  private _formatDuration(duration: number) {
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);
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

    return html`${(supportsFeature(
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
    if (
      !this.stateObj ||
      !supportsFeature(this.stateObj, MediaPlayerEntityFeature.SELECT_SOURCE) ||
      !this.stateObj.attributes.source_list?.length
    ) {
      return nothing;
    }

    return html`<ha-md-button-menu positioning="popover">
      <ha-button
        slot="trigger"
        appearance="plain"
        variant="neutral"
        size="small"
        title=${this.hass.localize(`ui.card.media_player.source`)}
      >
        <ha-svg-icon .path=${mdiLoginVariant}></ha-svg-icon>
      </ha-button>
      ${this.stateObj.attributes.source_list!.map(
        (source) =>
          html`<ha-md-menu-item
            data-source=${source}
            @click=${this._handleSourceClick}
            @keydown=${this._handleSourceClick}
            .selected=${source === this.stateObj?.attributes.source}
          >
            ${source}
          </ha-md-menu-item>`
      )}
    </ha-md-button-menu>`;
  }

  protected _renderSoundMode() {
    if (
      !this.stateObj ||
      !supportsFeature(
        this.stateObj,
        MediaPlayerEntityFeature.SELECT_SOUND_MODE
      ) ||
      !this.stateObj.attributes.sound_mode_list?.length
    ) {
      return nothing;
    }

    return html`<ha-md-button-menu positioning="popover">
      <ha-button
        slot="trigger"
        appearance="plain"
        variant="neutral"
        size="small"
        title=${this.hass.localize(`ui.card.media_player.sound_mode`)}
      >
        <ha-svg-icon .path=${mdiMusicNoteEighth}></ha-svg-icon>
      </ha-button>
      ${this.stateObj.attributes.sound_mode_list!.map(
        (soundMode) =>
          html`<ha-md-menu-item
            data-sound-mode=${soundMode}
            @click=${this._handleSoundModeClick}
            @keydown=${this._handleSoundModeClick}
            .selected=${soundMode === this.stateObj?.attributes.sound_mode}
          >
            ${soundMode}
          </ha-md-menu-item>`
      )}
    </ha-md-button-menu>`;
  }

  protected _renderGrouping() {
    if (
      !this.stateObj ||
      isUnavailableState(this.stateObj.state) ||
      !supportsFeature(this.stateObj, MediaPlayerEntityFeature.GROUPING)
    ) {
      return nothing;
    }
    const groupMembers = this.stateObj.attributes.group_members;
    const hasMultipleMembers = groupMembers && groupMembers?.length > 1;

    return html`<ha-button
      class="grouping"
      @click=${this._showGroupMediaPlayers}
      appearance="plain"
      variant="neutral"
      size="small"
      title=${this.hass.localize("ui.card.media_player.join")}
    >
      <div>
        <ha-svg-icon .path=${mdiSpeakerMultiple}></ha-svg-icon>
        ${hasMultipleMembers
          ? html`<span class="badge"> ${groupMembers?.length || 4} </span>`
          : nothing}
      </div>
    </ha-button>`;
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
    const playerObj = new HassMediaPlayerEntity(this.hass, this.stateObj);
    const position = Math.floor(playerObj.currentProgress) || 0;
    const duration = stateObj.attributes.media_duration || 0;
    const remaining = duration - position;
    const remainingFormatted =
      remaining > 0 ? this._formatDuration(remaining) : 0;
    const positionFormatted = this._formatDuration(position);
    const primaryTitle = playerObj.primaryTitle;
    const secondaryTitle = playerObj.secondaryTitle;
    const turnOn = controls?.find((c) => c.action === "turn_on");
    const turnOff = controls?.find((c) => c.action === "turn_off");

    return html`
      ${coverUrl
        ? html`<div class="cover-container">
            <img
              class=${classMap({
                "cover-image": true,
                "cover-image--playing": stateObj.state === "playing",
              })}
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
            ${primaryTitle
              ? html`<ha-marquee-text
                  class="media-title"
                  speed="30"
                  pause-on-hover
                >
                  ${primaryTitle}
                </ha-marquee-text>`
              : nothing}
            ${secondaryTitle
              ? html`<ha-marquee-text
                  class="media-artist"
                  speed="30"
                  pause-on-hover
                >
                  ${secondaryTitle}
                </ha-marquee-text>`
              : nothing}
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
                ?disabled=${!stateActive(stateObj) ||
                !supportsFeature(stateObj, MediaPlayerEntityFeature.SEEK)}
              >
                <span slot="reference">${positionFormatted}</span>
                <span slot="reference">${remainingFormatted}</span>
              </ha-slider>
            </div>
          `
        : nothing}
      <div class="bottom-controls">
        ${controls && controls.length > 0
          ? html`<div class="main-controls">
              ${["repeat_set", "media_previous_track"].map((action) => {
                const control = controls?.find((c) => c.action === action);
                return control
                  ? html`<ha-icon-button
                      action=${action}
                      @click=${this._handleClick}
                      .path=${control.icon}
                      .label=${this.hass.localize(
                        `ui.card.media_player.${control.action}`
                      )}
                    >
                    </ha-icon-button>`
                  : html`<span class="spacer"></span>`;
              })}
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
                        class="center-control"
                      >
                        <ha-svg-icon
                          .path=${control.icon}
                          aria-label=${this.hass.localize(
                            `ui.card.media_player.${control.action}`
                          )}
                        ></ha-svg-icon>
                      </ha-button>`
                    : nothing;
                }
              )}
              ${["media_next_track", "shuffle_set"].map((action) => {
                const control = controls?.find((c) => c.action === action);
                return control
                  ? html`<ha-icon-button
                      action=${action}
                      @click=${this._handleClick}
                      .path=${control.icon}
                      .label=${this.hass.localize(
                        `ui.card.media_player.${control.action}`
                      )}
                    >
                    </ha-icon-button>`
                  : html`<span class="spacer"></span>`;
              })}
            </div>`
          : nothing}
        ${this._renderVolumeControl()}
        <div class="controls-row">
          ${!isUnavailableState(stateObj.state) &&
          supportsFeature(stateObj, MediaPlayerEntityFeature.BROWSE_MEDIA)
            ? html`
                <ha-button
                  @click=${this._showBrowseMedia}
                  appearance="plain"
                  variant="neutral"
                  size="small"
                  title=${this.hass.localize(
                    "ui.card.media_player.browse_media"
                  )}
                >
                  <ha-svg-icon .path=${mdiPlayBoxMultiple}></ha-svg-icon>
                </ha-button>
              `
            : nothing}
          ${this._renderGrouping()} ${this._renderSourceControl()}
          ${this._renderSoundMode()}
          ${turnOn
            ? html`<ha-button
                action=${turnOn.action}
                @click=${this._handleClick}
                appearance="plain"
                variant="neutral"
                size="small"
                title=${this.hass.localize(
                  `ui.card.media_player.${turnOn.action}`
                )}
              >
                <ha-svg-icon .path=${turnOn.icon}></ha-svg-icon>
              </ha-button>`
            : nothing}
          ${turnOff
            ? html`<ha-button
                action=${turnOff.action}
                @click=${this._handleClick}
                appearance="plain"
                variant="neutral"
                size="small"
                title=${this.hass.localize(
                  `ui.card.media_player.${turnOff.action}`
                )}
              >
                <ha-svg-icon .path=${turnOff.icon}></ha-svg-icon>
              </ha-button>`
            : nothing}
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 24px;
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
      background-color: var(--secondary-background-color);
      font-size: 1.5em;
      color: var(--secondary-text-color);
    }

    .main-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .center-control {
      --ha-button-height: 56px;
    }

    .spacer {
      width: 48px;
    }

    .volume,
    .position-bar,
    .main-controls {
      direction: ltr;
    }

    .volume ha-slider,
    .position-bar ha-slider {
      width: 100%;
    }

    .volume {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-left: 8px;
    }

    .volume ha-svg-icon {
      padding: 4px;
      height: 16px;
      width: 16px;
    }

    .volume ha-icon-button {
      --mdc-icon-button-size: 32px;
      --mdc-icon-size: 16px;
    }

    .badge {
      position: absolute;
      top: -10px;
      left: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 16px;
      min-width: 8px;
      border-radius: 10px;
      font-weight: var(--ha-font-weight-normal);
      font-size: var(--ha-font-size-xs);
      background-color: var(--primary-color);
      padding: 0 4px;
      color: var(--primary-text-color);
    }

    .position-bar {
      display: flex;
      flex-direction: column;
    }

    .position-bar ha-slider::part(references) {
      color: var(--secondary-text-color);
    }

    .media-info-row {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      margin: 8px 0 8px 8px;
    }

    .media-title {
      font-size: var(--ha-font-size-xl);
      font-weight: var(--ha-font-weight-bold);
      margin-bottom: 4px;
    }

    .media-artist {
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-normal);
      color: var(--secondary-text-color);
    }

    .controls-row {
      display: flex;
      align-items: center;
      justify-content: space-around;
    }

    .controls-row ha-button {
      width: 32px;
    }

    .controls-row ha-svg-icon {
      color: var(--ha-color-on-neutral-quiet);
    }

    .grouping::part(label) {
      position: relative;
    }

    .bottom-controls {
      display: flex;
      flex-direction: column;
      gap: 24px;
      align-self: center;
      width: 320px;
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

  private _handleSoundModeClick(e: Event) {
    const soundMode = (e.currentTarget as HTMLElement).getAttribute(
      "data-sound-mode"
    );
    if (!soundMode || this.stateObj!.attributes.sound_mode === soundMode) {
      return;
    }

    this.hass.callService("media_player", "select_sound_mode", {
      entity_id: this.stateObj!.entity_id,
      sound_mode: soundMode,
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

  private async _handleMediaSeekChanged(e: Event): Promise<void> {
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
