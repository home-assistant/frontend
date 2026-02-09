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
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { debounce } from "../../../common/util/debounce";
import {
  startMediaProgressInterval,
  stopMediaProgressInterval,
} from "../../../common/util/media-progress";
import { VolumeSliderController } from "../../../common/util/volume-slider";
import "../../../components/chips/ha-assist-chip";
import "../../../components/ha-button";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-marquee-text";
import "../../../components/ha-select";
import type { HaSlider } from "../../../components/ha-slider";
import "../../../components/ha-svg-icon";
import { showJoinMediaPlayersDialog } from "../../../components/media-player/show-join-media-players-dialog";
import { showMediaBrowserDialog } from "../../../components/media-player/show-media-browser-dialog";
import { isUnavailableState } from "../../../data/entity/entity";
import type {
  MediaPickedEvent,
  MediaPlayerEntity,
} from "../../../data/media-player";
import {
  cleanupMediaTitle,
  computeMediaControls,
  computeMediaDescription,
  formatMediaTime,
  handleMediaControlClick,
  MediaPlayerEntityFeature,
  mediaPlayerPlayMedia,
} from "../../../data/media-player";
import type { HomeAssistant } from "../../../types";
import HassMediaPlayerEntity from "../../../util/hass-media-player-model";

@customElement("more-info-media_player")
class MoreInfoMediaPlayer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public stateObj?: MediaPlayerEntity;

  @query("#position-slider")
  private _positionSlider?: HaSlider;

  @query(".volume-slider")
  private _volumeSlider?: HaSlider;

  private _progressInterval?: number;

  private _volumeStep = 2;

  private _debouncedVolumeSet = debounce((value: number) => {
    this._setVolume(value);
  }, 100);

  private _volumeController = new VolumeSliderController({
    getSlider: () => this._volumeSlider,
    step: this._volumeStep,
    onSetVolume: (value) => this._setVolume(value),
    onSetVolumeDebounced: (value) => this._debouncedVolumeSet(value),
  });

  public connectedCallback(): void {
    super.connectedCallback();
    this._syncProgressInterval();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearProgressInterval();
  }

  protected firstUpdated(_changedProperties: PropertyValues) {
    if (this._positionSlider) {
      this._positionSlider.valueFormatter = (value: number) =>
        this._formatDuration(value);
    }
  }

  private _formatDuration(duration: number) {
    return formatMediaTime(duration);
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
                  <div
                    class="volume-slider-container"
                    @touchstart=${this._volumeController.handleTouchStart}
                    @touchmove=${this._volumeController.handleTouchMove}
                    @touchend=${this._volumeController.handleTouchEnd}
                    @touchcancel=${this._volumeController.handleTouchCancel}
                    @wheel=${this._volumeController.handleWheel}
                  >
                    <ha-slider
                      class="volume-slider"
                      labeled
                      id="input"
                      .value=${Number(this.stateObj.attributes.volume_level) *
                      100}
                      .step=${this._volumeStep}
                      @input=${this._volumeController.handleInput}
                      @change=${this._volumeController.handleChange}
                    ></ha-slider>
                  </div>
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

    return html`<ha-dropdown @wa-select=${this._handleSourceChange}>
      <ha-icon-button
        slot="trigger"
        .label=${this.hass.localize(`ui.card.media_player.source`)}
        .path=${mdiLoginVariant}
      >
      </ha-icon-button>
      ${this.stateObj.attributes.source_list!.map(
        (source) =>
          html`<ha-dropdown-item
            .value=${source}
            class=${source === this.stateObj?.attributes.source
              ? "selected"
              : ""}
          >
            ${this.hass.formatEntityAttributeValue(
              this.stateObj!,
              "source",
              source
            )}
          </ha-dropdown-item>`
      )}
    </ha-dropdown>`;
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

    return html`<ha-dropdown @wa-select=${this._handleSoundModeChange}>
      <ha-icon-button
        slot="trigger"
        .label=${this.hass.localize(`ui.card.media_player.sound_mode`)}
        .path=${mdiMusicNoteEighth}
      >
      </ha-icon-button>
      ${this.stateObj.attributes.sound_mode_list!.map(
        (soundMode) =>
          html`<ha-dropdown-item
            .value=${soundMode}
            class=${soundMode === this.stateObj?.attributes.sound_mode
              ? "selected"
              : ""}
          >
            ${this.hass.formatEntityAttributeValue(
              this.stateObj!,
              "sound_mode",
              soundMode
            )}
          </ha-dropdown-item>`
      )}
    </ha-dropdown>`;
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

    return html`<ha-icon-button
      @click=${this._showGroupMediaPlayers}
      .title=${this.hass.localize("ui.card.media_player.join")}
    >
      <div class="grouping">
        <ha-svg-icon .path=${mdiSpeakerMultiple}></ha-svg-icon>
        ${hasMultipleMembers
          ? html`<span class="badge">${groupMembers?.length || 4}</span>`
          : nothing}
      </div>
    </ha-icon-button>`;
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
    const coverUrlRaw =
      stateObj.attributes.entity_picture_local ||
      stateObj.attributes.entity_picture ||
      "";
    const coverUrl = coverUrlRaw ? this.hass.hassUrl(coverUrlRaw) : "";
    const playerObj = new HassMediaPlayerEntity(this.hass, this.stateObj);

    const position = Math.max(Math.floor(playerObj.currentProgress || 0), 0);
    const duration = Math.max(stateObj.attributes.media_duration || 0, 0);
    const positionFormatted = this._formatDuration(position);
    const durationFormatted = this._formatDuration(duration);
    const primaryTitle = cleanupMediaTitle(stateObj.attributes.media_title);
    const secondaryTitle = computeMediaDescription(stateObj);
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
                id="position-slider"
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
                <span class="position-time" slot="reference"
                  >${positionFormatted}</span
                >
                <span class="position-time" slot="reference"
                  >${durationFormatted}</span
                >
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
              ${[
                "media_play_pause",
                "media_pause",
                "media_play",
                "media_stop",
              ].map((action) => {
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
              })}
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
                <ha-icon-button
                  @click=${this._showBrowseMedia}
                  .title=${this.hass.localize(
                    "ui.card.media_player.browse_media"
                  )}
                  .path=${mdiPlayBoxMultiple}
                >
                </ha-icon-button>
              `
            : nothing}
          ${this._renderGrouping()} ${this._renderSourceControl()}
          ${this._renderSoundMode()}
          ${turnOn
            ? html`<ha-icon-button
                action=${turnOn.action}
                @click=${this._handleClick}
                .title=${this.hass.localize(
                  `ui.card.media_player.${turnOn.action}`
                )}
                .path=${turnOn.icon}
              >
              </ha-icon-button>`
            : nothing}
          ${turnOff
            ? html`<ha-icon-button
                action=${turnOff.action}
                @click=${this._handleClick}
                .title=${this.hass.localize(
                  `ui.card.media_player.${turnOff.action}`
                )}
                .path=${turnOff.icon}
              >
              </ha-icon-button>`
            : nothing}
        </div>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-6);
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
      border-radius: var(--ha-border-radius-sm);
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

    @media (max-height: 750px) {
      .cover-container {
        height: 120px;
      }

      .cover-image {
        width: 100px;
        height: 100px;
      }

      .cover-image--playing {
        width: 120px;
        height: 120px;
      }
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
      gap: var(--ha-space-3);
      margin-left: var(--ha-space-2);
    }

    .volume-slider-container {
      width: 100%;
    }

    @media (pointer: coarse) {
      .volume-slider {
        pointer-events: none;
      }
    }

    .volume ha-svg-icon {
      padding: var(--ha-space-1);
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
      left: var(--ha-space-4);
      display: flex;
      justify-content: center;
      align-items: center;
      height: 16px;
      min-width: var(--ha-space-2);
      border-radius: var(--ha-border-radius-md);
      font-weight: var(--ha-font-weight-normal);
      font-size: var(--ha-font-size-xs);
      background-color: var(--primary-color);
      padding: 0 var(--ha-space-1);
      color: var(--text-primary-color);
    }

    .position-bar {
      display: flex;
      flex-direction: column;
    }

    .position-bar ha-slider::part(references) {
      color: var(--secondary-text-color);
    }

    .position-time {
      margin-top: var(--ha-space-2);
    }

    .media-info-row {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      margin: var(--ha-space-2) 0 var(--ha-space-2) var(--ha-space-2);
    }

    .media-title {
      font-size: var(--ha-font-size-xl);
      font-weight: var(--ha-font-weight-bold);
      margin-bottom: var(--ha-space-1);
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

    .controls-row ha-icon-button {
      color: var(--secondary-text-color);
    }

    .controls-row ha-svg-icon {
      color: var(--ha-color-on-neutral-quiet);
    }

    .grouping {
      position: relative;
    }

    .bottom-controls {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-6);
      align-self: center;
      width: 320px;
    }

    ha-dropdown-item.selected {
      font-weight: var(--ha-font-weight-medium);
      color: var(--primary-color);
      background-color: var(--ha-color-fill-primary-quiet-resting);
      --icon-primary-color: var(--primary-color);
    }
  `;

  private _handleClick(e: MouseEvent): void {
    handleMediaControlClick(
      this.hass!,
      this.stateObj!,
      (e.currentTarget as HTMLElement).getAttribute("action")!
    );
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has("stateObj")) {
      this._syncProgressInterval();
    }
  }

  private _syncProgressInterval(): void {
    if (this._shouldUpdateProgress()) {
      this._progressInterval = startMediaProgressInterval(
        this._progressInterval,
        () => this.requestUpdate()
      );
      return;
    }
    this._clearProgressInterval();
  }

  private _clearProgressInterval(): void {
    this._progressInterval = stopMediaProgressInterval(this._progressInterval);
  }

  private _shouldUpdateProgress(): boolean {
    const stateObj = this.stateObj;
    return (
      !!stateObj &&
      stateObj.state === "playing" &&
      Number(stateObj.attributes.media_duration) > 0 &&
      "media_position" in stateObj.attributes &&
      "media_position_updated_at" in stateObj.attributes
    );
  }

  private _toggleMute() {
    this.hass!.callService("media_player", "volume_mute", {
      entity_id: this.stateObj!.entity_id,
      is_volume_muted: !this.stateObj!.attributes.is_volume_muted,
    });
  }

  private _setVolume(value: number) {
    this.hass!.callService("media_player", "volume_set", {
      entity_id: this.stateObj!.entity_id,
      volume_level: value / 100,
    });
  }

  private _handleSourceChange(e: HaDropdownSelectEvent) {
    const source = e.detail.item.value;
    if (!source || this.stateObj!.attributes.source === source) {
      return;
    }

    this.hass.callService("media_player", "select_source", {
      entity_id: this.stateObj!.entity_id,
      source,
    });
  }

  private _handleSoundModeChange(ev: HaDropdownSelectEvent) {
    const soundMode = ev.detail.item.value;
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
