import {
  mdiFolderMusic,
  mdiImport,
  mdiMusicNote,
  mdiShuffleVariant,
  mdiSpeakerMultiple,
  mdiVolumeMinus,
  mdiVolumePlus,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { stopPropagation } from "../../../common/dom/stop_propagation";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { debounce } from "../../../common/util/debounce";
import {
  startMediaProgressInterval,
  stopMediaProgressInterval,
} from "../../../common/util/media-progress";
import { VolumeSliderController } from "../../../common/util/volume-slider";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-group";
import "../../../components/ha-icon-button-toggle";
import "../../../components/ha-list-item";
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
import "../components/ha-more-info-control-select-container";
import "../components/ha-more-info-state-header";
import { moreInfoControlStyle } from "../components/more-info-control-style";

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

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has("stateObj")) {
      this._syncProgressInterval();
    }
  }

  private _formatDuration(duration: number) {
    return formatMediaTime(duration);
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

  private _handleClick(e: MouseEvent): void {
    handleMediaControlClick(
      this.hass!,
      this.stateObj!,
      (e.currentTarget as HTMLElement).getAttribute("action")!
    );
  }

  private _setVolume(value: number) {
    this.hass!.callService("media_player", "volume_set", {
      entity_id: this.stateObj!.entity_id,
      volume_level: value / 100,
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

  // ─────────────────────────────────────────────────────────────
  // new-style helpers for bottom row [group][browse][sources][shuffle]
  // ─────────────────────────────────────────────────────────────

  private get _sourceList(): string[] {
    return this.stateObj?.attributes.source_list ?? [];
  }

  // Option B: alias handler for Browse (no template arrows)
  private _handleBrowse = (ev: Event) => {
    ev.stopPropagation();
    this._showBrowseMedia();
  };

  private _handleGroupClick = (ev: Event) => {
    ev.stopPropagation();
    this._showGroupMediaPlayers();
  };

  private _handleSourceChanged = (ev: Event) => {
    ev.stopPropagation();
    const newVal = (ev.target as any).value as string | undefined;

    if (!newVal || this.stateObj!.attributes.source === newVal) {
      return;
    }

    this.hass.callService("media_player", "select_source", {
      entity_id: this.stateObj!.entity_id,
      source: newVal,
    });
  };

  private _toggleShuffle = (ev: Event) => {
    ev.stopPropagation();
    const newVal = !this.stateObj!.attributes.shuffle;

    this.hass.callService("media_player", "shuffle_set", {
      entity_id: this.stateObj!.entity_id,
      shuffle: newVal,
    });
  };

  // ─────────────────────────────────────────────────────────────
  // UI helpers
  // ─────────────────────────────────────────────────────────────

  private _renderEmptyCover(title: string, icon?: string) {
    return html`
      <div class="cover-container">
        <div class="cover-image empty-cover" role="img" aria-label=${title}>
          ${icon ? html`<ha-svg-icon .path=${icon}></ha-svg-icon>` : title}
        </div>
      </div>
    `;
  }

  protected _renderVolumeControl() {
    if (!this.stateObj) {
      return nothing;
    }

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
            <ha-icon-button
              action="volume_down"
              .path=${mdiVolumeMinus}
              .label=${this.hass.localize(
                "ui.card.media_player.media_volume_down"
              )}
              @click=${this._handleClick}
            ></ha-icon-button>

            ${supportsSliding
              ? html`
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
                      .value=${Number(this.stateObj!.attributes.volume_level) *
                      100}
                      .step=${this._volumeStep}
                      @input=${this._volumeController.handleInput}
                      @change=${this._volumeController.handleChange}
                    ></ha-slider>
                  </div>
                `
              : nothing}

            <ha-icon-button
              action="volume_up"
              .path=${mdiVolumePlus}
              .label=${this.hass.localize(
                "ui.card.media_player.media_volume_up"
              )}
              @click=${this._handleClick}
            ></ha-icon-button>
          </div>
        `
      : nothing}`;
  }

  private _renderPrevControl(
    controls: ReturnType<typeof computeMediaControls>
  ) {
    const prev = controls?.find((c) => c.action === "media_previous_track");
    return prev
      ? html`
          <ha-icon-button
            action="media_previous_track"
            @click=${this._handleClick}
            .label=${this.hass.localize(
              "ui.card.media_player.media_previous_track"
            )}
          >
            <ha-svg-icon .path=${prev.icon}></ha-svg-icon>
          </ha-icon-button>
        `
      : html`<span class="spacer"></span>`;
  }

  private _renderCenterControl(
    controls: ReturnType<typeof computeMediaControls>
  ) {
    const center =
      controls?.find((c) => c.action === "media_play_pause") ??
      controls?.find((c) => c.action === "media_pause") ??
      controls?.find((c) => c.action === "media_play");

    return center
      ? html`
          <ha-icon-button
            action=${center.action}
            @click=${this._handleClick}
            .label=${this.hass.localize(
              `ui.card.media_player.${center.action}`
            )}
          >
            <ha-svg-icon .path=${center.icon}></ha-svg-icon>
          </ha-icon-button>
        `
      : nothing;
  }

  private _renderNextControl(
    controls: ReturnType<typeof computeMediaControls>
  ) {
    const next = controls?.find((c) => c.action === "media_next_track");
    return next
      ? html`
          <ha-icon-button
            action="media_next_track"
            @click=${this._handleClick}
            .label=${this.hass.localize(
              "ui.card.media_player.media_next_track"
            )}
          >
            <ha-svg-icon .path=${next.icon}></ha-svg-icon>
          </ha-icon-button>
        `
      : html`<span class="spacer"></span>`;
  }

  private _renderTransportControls(
    controls: ReturnType<typeof computeMediaControls>
  ): TemplateResult | typeof nothing {
    if (!controls || controls.length === 0) {
      return nothing;
    }

    return html`
      <div class="bottom-controls">
        <ha-icon-button-group>
          ${this._renderPrevControl(controls)}
          ${this._renderCenterControl(controls)}
          ${this._renderNextControl(controls)}
        </ha-icon-button-group>
      </div>
    `;
  }

  private _renderBottomRowControls(): TemplateResult | typeof nothing {
    if (!this.stateObj) {
      return nothing;
    }

    const supportsBrowse =
      this.hass.services.media_player?.browse_media !== undefined;

    const supportsSources =
      supportsFeature(this.stateObj, MediaPlayerEntityFeature.SELECT_SOURCE) &&
      this._sourceList.length > 0;

    const supportsShuffle = supportsFeature(
      this.stateObj,
      MediaPlayerEntityFeature.SHUFFLE_SET
    );

    const supportsGrouping =
      supportsFeature(this.stateObj, MediaPlayerEntityFeature.GROUPING) &&
      !isUnavailableState(this.stateObj.state);

    if (
      !supportsGrouping &&
      !supportsBrowse &&
      !supportsSources &&
      !supportsShuffle
    ) {
      return nothing;
    }

    return html`
      <ha-more-info-control-select-container>
        ${supportsGrouping
          ? html`
              <ha-icon-button
                .label=${this.hass.localize("ui.card.media_player.join")}
                .disabled=${isUnavailableState(this.stateObj!.state)}
                @click=${this._handleGroupClick}
              >
                <ha-svg-icon .path=${mdiSpeakerMultiple}></ha-svg-icon>
              </ha-icon-button>
            `
          : nothing}
        ${supportsBrowse
          ? html`
              <ha-icon-button
                .label=${this.hass.localize(
                  "ui.card.media_player.browse_media"
                )}
                .disabled=${isUnavailableState(this.stateObj!.state)}
                @click=${this._handleBrowse}
              >
                <ha-svg-icon .path=${mdiFolderMusic}></ha-svg-icon>
              </ha-icon-button>
            `
          : nothing}
        ${supportsSources
          ? html`
              <ha-control-select-menu
                .label=${this.hass.formatEntityAttributeName(
                  this.stateObj,
                  "source"
                )}
                .value=${this.stateObj!.attributes.source}
                .disabled=${isUnavailableState(this.stateObj!.state)}
                fixedMenuPosition
                naturalMenuWidth
                @selected=${this._handleSourceChanged}
                @closed=${stopPropagation}
              >
                <ha-svg-icon slot="icon" .path=${mdiImport}></ha-svg-icon>

                ${this._sourceList.map(
                  (source) => html`
                    <ha-list-item .value=${source} graphic="icon">
                      <ha-svg-icon
                        slot="graphic"
                        .path=${mdiImport}
                      ></ha-svg-icon>
                      ${this.hass.formatEntityAttributeValue(
                        this.stateObj!,
                        "source",
                        source
                      )}
                    </ha-list-item>
                  `
                )}
              </ha-control-select-menu>
            `
          : nothing}
        ${supportsShuffle
          ? html`
              <ha-icon-button-toggle
                .selected=${!!this.stateObj!.attributes.shuffle}
                .disabled=${isUnavailableState(this.stateObj!.state)}
                .label=${this.hass.localize("ui.card.media_player.shuffle")}
                @click=${this._toggleShuffle}
              >
                <ha-svg-icon .path=${mdiShuffleVariant}></ha-svg-icon>
              </ha-icon-button-toggle>
            `
          : nothing}
      </ha-more-info-control-select-container>
    `;
  }

  protected render() {
    if (!this.hass || !this.stateObj) {
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

    const playerObj = new HassMediaPlayerEntity(this.hass, stateObj);
    const position = Math.max(Math.floor(playerObj.currentProgress || 0), 0);
    const duration = Math.max(stateObj.attributes.media_duration || 0, 0);

    const positionFormatted = this._formatDuration(position);
    const durationFormatted = this._formatDuration(duration);

    const primaryTitle = cleanupMediaTitle(stateObj.attributes.media_title);
    const secondaryTitle = computeMediaDescription(stateObj);

    return html`
      <ha-more-info-state-header
        .hass=${this.hass}
        .stateObj=${this.stateObj as any}
        .stateOverride=${primaryTitle || undefined}
      ></ha-more-info-state-header>

      ${coverUrl
        ? html`
            <div class="cover-container">
              <img
                class=${classMap({
                  "cover-image": true,
                  "cover-image--playing": stateObj.state === "playing",
                })}
                src=${coverUrl}
                alt=${ifDefined(primaryTitle)}
              />
            </div>
          `
        : this._renderEmptyCover(
            secondaryTitle || this.hass.formatEntityState(stateObj),
            mdiMusicNote
          )}
      ${duration > 0
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
      ${this._renderTransportControls(controls)} ${this._renderVolumeControl()}
      ${this._renderBottomRowControls()}
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      moreInfoControlStyle,
      css`
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

        .spacer {
          width: 48px;
        }

        .volume,
        .position-bar {
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
          justify-content: center;
        }

        .volume-slider-container {
          width: 100%;
        }

        @media (pointer: coarse) {
          .volume-slider {
            pointer-events: none;
          }
        }

        .volume ha-icon-button {
          --mdc-icon-button-size: 32px;
          --mdc-icon-size: 16px;
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

        .bottom-controls {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-6);
          align-self: center;
          width: 320px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "more-info-media_player": MoreInfoMediaPlayer;
  }
}
