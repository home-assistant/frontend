import {
  mdiChevronDown,
  mdiMonitor,
  mdiPause,
  mdiPlay,
  mdiPlayPause,
  mdiStop,
  mdiVolumeHigh,
} from "@mdi/js";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { until } from "lit/directives/until";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { supportsFeature } from "../../common/entity/supports-feature";
import { debounce } from "../../common/util/debounce";
import {
  startMediaProgressInterval,
  stopMediaProgressInterval,
} from "../../common/util/media-progress";
import { VolumeSliderController } from "../../common/util/volume-slider";
import "../../components/ha-button";
import "../../components/ha-domain-icon";
import "../../components/ha-dropdown";
import "../../components/ha-dropdown-item";
import "../../components/ha-icon-button";
import "../../components/ha-slider";
import "../../components/ha-spinner";
import "../../components/ha-state-icon";
import "../../components/ha-svg-icon";
import { UNAVAILABLE } from "../../data/entity/entity";
import type {
  ControlButton,
  MediaPlayerEntity,
  MediaPlayerItem,
} from "../../data/media-player";
import {
  BROWSER_PLAYER,
  MediaPlayerEntityFeature,
  cleanupMediaTitle,
  computeMediaControls,
  computeMediaDescription,
  formatMediaTime,
  getCurrentProgress,
  handleMediaControlClick,
  setMediaPlayerVolume,
} from "../../data/media-player";
import type { ResolvedMediaSource } from "../../data/media_source";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../types";
import type { HaSlider } from "../../components/ha-slider";
import "../lovelace/components/hui-marquee";
import {
  BrowserMediaPlayer,
  ERR_UNSUPPORTED_MEDIA,
} from "./browser-media-player";

declare global {
  interface HASSDomEvents {
    "player-picked": { entityId: string };
  }
}

@customElement("ha-bar-media-player")
export class BarMediaPlayer extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @query(".progress-slider") private _progressBar?: HaSlider;

  @query("#CurrentProgress") private _currentProgress?: HTMLElement;

  @query(".volume-slider") private _volumeSlider?: HaSlider;

  @state() private _marqueeActive = false;

  @state() private _newMediaExpected = false;

  @state() private _browserPlayer?: BrowserMediaPlayer;

  private _volumeValue = 0;

  private _progressInterval?: number;

  private _browserPlayerVolume = 0.8;

  private _volumeStep = 2;

  private _debouncedVolumeSet = debounce((value: number) => {
    this._setVolume(value);
  }, 100);

  private _volumeController = new VolumeSliderController({
    getSlider: () => this._volumeSlider,
    step: this._volumeStep,
    onSetVolume: (value) => this._setVolume(value),
    onSetVolumeDebounced: (value) => this._debouncedVolumeSet(value),
    onValueUpdated: (value) => {
      this._volumeValue = value;
    },
  });

  public connectedCallback(): void {
    super.connectedCallback();

    const stateObj = this._stateObj;

    if (!stateObj) {
      return;
    }

    if (
      this._showProgressBar &&
      stateObj.state === "playing" &&
      !this._progressInterval
    ) {
      this._progressInterval = startMediaProgressInterval(
        this._progressInterval,
        () => this._updateProgressBar()
      );
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._progressInterval = stopMediaProgressInterval(this._progressInterval);
    this._tearDownBrowserPlayer();
  }

  public showResolvingNewMediaPicked() {
    this._tearDownBrowserPlayer();
    this._newMediaExpected = true;
    // Sometimes the state does not update when playing media, like with TTS, so we wait max 2 secs and then stop waiting
    this._debouncedResetMediaExpected();
  }

  private _debouncedResetMediaExpected = debounce(() => {
    this._newMediaExpected = false;
  }, 2000);

  public hideResolvingNewMediaPicked() {
    this._newMediaExpected = false;
  }

  public playItem(item: MediaPlayerItem, resolved: ResolvedMediaSource) {
    if (this.entityId !== BROWSER_PLAYER) {
      throw Error("Only browser supported");
    }
    this._tearDownBrowserPlayer();
    try {
      this._browserPlayer = new BrowserMediaPlayer(
        this.hass,
        item,
        resolved,
        this._browserPlayerVolume,
        () => this.requestUpdate("_browserPlayer")
      );
    } catch (err: any) {
      if (err.message === ERR_UNSUPPORTED_MEDIA) {
        showAlertDialog(this, {
          text: this.hass.localize(
            "ui.components.media-browser.media_not_supported"
          ),
        });
      } else {
        throw err;
      }
    }
    this._newMediaExpected = false;
  }

  protected render() {
    if (this._newMediaExpected) {
      return html`
        <div class="controls-progress buffering">
          ${until(
            // Only show spinner after 500ms
            new Promise((resolve) => {
              setTimeout(resolve, 500);
            }).then(() => html`<ha-spinner></ha-spinner>`)
          )}
        </div>
      `;
    }

    const isBrowser = this.entityId === BROWSER_PLAYER;
    const stateObj = this._stateObj;

    if (!stateObj) {
      return this._renderChoosePlayer(stateObj, this._volumeValue);
    }

    const controls: ControlButton[] | undefined = !this.narrow
      ? computeMediaControls(stateObj, true)
      : (stateObj.state === "playing" &&
            (supportsFeature(stateObj, MediaPlayerEntityFeature.PAUSE) ||
              supportsFeature(stateObj, MediaPlayerEntityFeature.STOP))) ||
          ((stateObj.state === "paused" || stateObj.state === "idle") &&
            supportsFeature(stateObj, MediaPlayerEntityFeature.PLAY)) ||
          (stateObj.state === "on" &&
            (supportsFeature(stateObj, MediaPlayerEntityFeature.PLAY) ||
              supportsFeature(stateObj, MediaPlayerEntityFeature.PAUSE)))
        ? [
            {
              icon:
                stateObj.state === "on"
                  ? mdiPlayPause
                  : stateObj.state !== "playing"
                    ? mdiPlay
                    : supportsFeature(stateObj, MediaPlayerEntityFeature.PAUSE)
                      ? mdiPause
                      : mdiStop,
              action:
                stateObj.state !== "playing"
                  ? "media_play"
                  : supportsFeature(stateObj, MediaPlayerEntityFeature.PAUSE)
                    ? "media_pause"
                    : "media_stop",
            },
          ]
        : undefined;
    const mediaDescription = computeMediaDescription(stateObj);
    const mediaDuration = formatMediaTime(stateObj.attributes.media_duration);
    const mediaTitleClean = cleanupMediaTitle(
      stateObj.attributes.media_title || stateObj.attributes.media_content_id
    );
    const mediaArt =
      stateObj.attributes.entity_picture_local ||
      stateObj.attributes.entity_picture;
    return html`
      <div
        class=${classMap({
          info: true,
          pointer: !isBrowser,
          app: this._browserPlayer?.item.media_class === "app",
        })}
        @click=${this._openMoreInfo}
      >
        ${mediaArt
          ? html`<img alt="" src=${this.hass.hassUrl(mediaArt)} />`
          : ""}
        <div class="media-info">
          <hui-marquee
            .text=${mediaTitleClean ||
            mediaDescription ||
            (stateObj.state !== "playing" && stateObj.state !== "on"
              ? this.hass.localize(`ui.card.media_player.nothing_playing`)
              : "")}
            .active=${this._marqueeActive}
            @mouseover=${this._marqueeMouseOver}
            @mouseleave=${this._marqueeMouseLeave}
          ></hui-marquee>
          <span class="secondary">
            ${mediaTitleClean ? mediaDescription : ""}
          </span>
        </div>
      </div>
      <div
        class="controls-progress ${stateObj.state === "buffering"
          ? "buffering"
          : ""}"
      >
        ${stateObj.state === "buffering"
          ? html`<ha-spinner></ha-spinner> `
          : html`
              <div class="controls">
                ${controls === undefined
                  ? ""
                  : controls.map(
                      (control) => html`
                        <ha-icon-button
                          .label=${this.hass.localize(
                            `ui.card.media_player.${control.action}`
                          )}
                          .path=${control.icon}
                          action=${control.action}
                          @click=${this._handleControlClick}
                        >
                        </ha-icon-button>
                      `
                    )}
              </div>
              ${stateObj.attributes.media_duration === Infinity
                ? nothing
                : this.narrow
                  ? html`<ha-slider
                      class="progress-slider"
                      min="0"
                      max=${stateObj.attributes.media_duration || 0}
                      step="1"
                      .value=${getCurrentProgress(stateObj)}
                      .withTooltip=${false}
                      size="small"
                      aria-label=${this.hass.localize(
                        "ui.card.media_player.track_position"
                      )}
                      ?disabled=${isBrowser ||
                      !supportsFeature(stateObj, MediaPlayerEntityFeature.SEEK)}
                      @change=${this._handleMediaSeekChanged}
                    ></ha-slider>`
                  : html`
                      <div class="progress">
                        <div id="CurrentProgress"></div>
                        <ha-slider
                          class="progress-slider"
                          min="0"
                          max=${stateObj.attributes.media_duration || 0}
                          step="1"
                          .value=${getCurrentProgress(stateObj)}
                          .withTooltip=${false}
                          size="small"
                          aria-label=${this.hass.localize(
                            "ui.card.media_player.track_position"
                          )}
                          ?disabled=${isBrowser ||
                          !supportsFeature(
                            stateObj,
                            MediaPlayerEntityFeature.SEEK
                          )}
                          @change=${this._handleMediaSeekChanged}
                        ></ha-slider>
                        <div>${mediaDuration}</div>
                      </div>
                    `}
            `}
      </div>
      ${this._renderChoosePlayer(stateObj, this._volumeValue)}
    `;
  }

  private _renderChoosePlayer(
    stateObj: MediaPlayerEntity | undefined,
    volumeValue: number
  ) {
    const isBrowser = this.entityId === BROWSER_PLAYER;
    return html`
    <div class="choose-player ${isBrowser ? "browser" : ""}">
      ${
        !this.narrow &&
        stateObj &&
        supportsFeature(stateObj, MediaPlayerEntityFeature.VOLUME_SET)
          ? html`
              <ha-dropdown class="volume-menu" placement="top" .distance=${8}>
                <ha-icon-button
                  slot="trigger"
                  .path=${mdiVolumeHigh}
                ></ha-icon-button>
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
                    min="0"
                    max="100"
                    .step=${this._volumeStep}
                    .value=${volumeValue}
                    @input=${this._volumeController.handleInput}
                    @change=${this._volumeController.handleChange}
                  >
                  </ha-slider>
                </div>
              </ha-dropdown>
            `
          : ""
      }

          <ha-dropdown
            class="player-menu"
            placement="top-end"
            .distance=${8}
            @wa-select=${this._handlePlayerSelect}
          >
            ${
              this.narrow
                ? html`
                    <ha-icon-button slot="trigger">
                      ${this._renderIcon(isBrowser, stateObj)}
                    </ha-icon-button>
                  `
                : html`
                    <ha-button slot="trigger">
                      <span slot="start">
                        ${this._renderIcon(isBrowser, stateObj)}
                      </span>
                      ${this.narrow
                        ? nothing
                        : isBrowser
                          ? this.hass.localize(
                              "ui.components.media-browser.web-browser"
                            )
                          : stateObj
                            ? computeStateName(stateObj)
                            : this.entityId}
                      <ha-svg-icon
                        slot="end"
                        .path=${mdiChevronDown}
                      ></ha-svg-icon>
                    </ha-button>
                  `
            }
            <ha-dropdown-item
              class=${isBrowser ? "selected" : ""}
              .value=${BROWSER_PLAYER}
            >
              ${this.hass.localize("ui.components.media-browser.web-browser")}
            </ha-dropdown-item>
            ${this._mediaPlayerEntities.map(
              (source) => html`
                <ha-dropdown-item
                  class=${source.entity_id === this.entityId ? "selected" : ""}
                  .disabled=${source.state === UNAVAILABLE}
                  .value=${source.entity_id}
                >
                  ${computeStateName(source)}
                </ha-dropdown-item>
              `
            )}
          </ha-dropdown>
        </div>
      </div>

    `;
  }

  private _renderIcon(isBrowser: boolean, stateObj?: MediaPlayerEntity) {
    if (isBrowser) {
      return html`<ha-svg-icon .path=${mdiMonitor}></ha-svg-icon>`;
    }
    if (stateObj) {
      return html`
        <ha-state-icon .hass=${this.hass} .stateObj=${stateObj}></ha-state-icon>
      `;
    }
    return html`
      <ha-domain-icon
        .hass=${this.hass}
        .domain=${computeDomain(this.entityId)}
      ></ha-domain-icon>
    `;
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (changedProps.has("entityId")) {
      this._tearDownBrowserPlayer();
    }
    if (!changedProps.has("hass") || this.entityId === BROWSER_PLAYER) {
      return;
    }
    // Reset new media expected if media player state changes
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (
      !oldHass ||
      oldHass.states[this.entityId] !== this.hass.states[this.entityId]
    ) {
      this._newMediaExpected = false;
    }
    if (changedProps.has("hass")) {
      this._updateVolumeValueFromState(this._stateObj);
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (this.entityId === BROWSER_PLAYER) {
      if (!changedProps.has("_browserPlayer")) {
        return;
      }
    } else {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (oldHass && oldHass.states[this.entityId] === this._stateObj) {
        return;
      }
    }

    const stateObj = this._stateObj;

    if (this.entityId === BROWSER_PLAYER) {
      this._updateVolumeValueFromState(stateObj);
    }

    this._updateProgressBar();
    this._syncVolumeSlider();

    if (this._showProgressBar && stateObj?.state === "playing") {
      this._progressInterval = startMediaProgressInterval(
        this._progressInterval,
        () => this._updateProgressBar()
      );
    } else if (
      this._progressInterval &&
      (!this._showProgressBar || stateObj?.state !== "playing")
    ) {
      this._progressInterval = stopMediaProgressInterval(
        this._progressInterval
      );
    }
  }

  private get _stateObj(): MediaPlayerEntity | undefined {
    if (this.entityId === BROWSER_PLAYER) {
      return this._browserPlayer
        ? this._browserPlayer.toStateObj()
        : BrowserMediaPlayer.idleStateObj();
    }
    return this.hass!.states[this.entityId] as MediaPlayerEntity | undefined;
  }

  private _tearDownBrowserPlayer() {
    if (this._browserPlayer) {
      this._browserPlayer.remove();
      this._browserPlayer = undefined;
    }
  }

  private _openMoreInfo() {
    if (this.entityId === BROWSER_PLAYER) {
      return;
    }
    fireEvent(this, "hass-more-info", { entityId: this.entityId });
  }

  private get _showProgressBar() {
    if (!this.hass) {
      return false;
    }

    const stateObj = this._stateObj;

    return (
      stateObj &&
      (stateObj.state === "playing" || stateObj.state === "paused") &&
      "media_duration" in stateObj.attributes &&
      "media_position" in stateObj.attributes
    );
  }

  private get _mediaPlayerEntities() {
    return Object.values(this.hass!.states).filter(
      (entity) =>
        computeStateDomain(entity) === "media_player" &&
        supportsFeature(entity, MediaPlayerEntityFeature.BROWSE_MEDIA) &&
        !this.hass.entities[entity.entity_id]?.hidden
    );
  }

  private _updateProgressBar(): void {
    const stateObj = this._stateObj;

    if (!this._progressBar || !stateObj) {
      return;
    }

    if (!stateObj.attributes.media_duration) {
      this._progressBar.value = 0;
      if (this._currentProgress) {
        this._currentProgress.innerHTML = "";
      }
      return;
    }

    const currentProgress = getCurrentProgress(stateObj);
    this._progressBar.max = stateObj.attributes.media_duration;
    this._progressBar.value = currentProgress;

    if (this._currentProgress) {
      this._currentProgress.innerHTML = formatMediaTime(currentProgress);
    }
  }

  private _updateVolumeValueFromState(stateObj?: MediaPlayerEntity): void {
    if (!stateObj) {
      return;
    }
    const volumeLevel = stateObj.attributes.volume_level;
    if (typeof volumeLevel !== "number" || !Number.isFinite(volumeLevel)) {
      return;
    }
    this._volumeValue = Math.round(volumeLevel * 100);
  }

  private _syncVolumeSlider(): void {
    if (!this._volumeSlider || this._volumeController.isInteracting) {
      return;
    }
    this._volumeSlider.value = this._volumeValue;
  }

  private _handleControlClick(e: MouseEvent): void {
    const action = (e.currentTarget! as HTMLElement).getAttribute("action")!;

    if (!this._browserPlayer) {
      handleMediaControlClick(
        this.hass!,
        this._stateObj!,
        (e.currentTarget as HTMLElement).getAttribute("action")!
      );
      return;
    }
    if (action === "media_pause") {
      this._browserPlayer.pause();
    } else if (action === "media_play") {
      this._browserPlayer.play();
    }
  }

  private _handleMediaSeekChanged(e: Event): void {
    if (this.entityId === BROWSER_PLAYER || !this._stateObj) {
      return;
    }

    const newValue = (e.target as HaSlider).value;
    this.hass.callService("media_player", "media_seek", {
      entity_id: this._stateObj.entity_id,
      seek_position: newValue,
    });
  }

  private _marqueeMouseOver(): void {
    if (!this._marqueeActive) {
      this._marqueeActive = true;
    }
  }

  private _marqueeMouseLeave(): void {
    if (this._marqueeActive) {
      this._marqueeActive = false;
    }
  }

  private _handlePlayerSelect(ev: CustomEvent): void {
    const entityId = (ev.detail.item as any).value;
    fireEvent(this, "player-picked", { entityId });
  }

  private _setVolume(value: number) {
    const volume = value / 100;
    if (this._browserPlayer) {
      this._browserPlayerVolume = volume;
      this._browserPlayer.setVolume(volume);
      return;
    }
    setMediaPlayerVolume(this.hass, this.entityId, volume);
  }

  static styles = css`
    :host {
      display: flex;
      height: 100px;
      box-sizing: border-box;
      background: var(
        --ha-card-background,
        var(--card-background-color, white)
      );
      border-top: 1px solid var(--divider-color);
      margin-right: var(--safe-area-inset-right);
    }
    :host([narrow]) {
      margin-left: var(--safe-area-inset-left);
    }

    ha-slider {
      width: 100%;
      min-width: 100%;
      --ha-slider-thumb-color: var(--primary-color);
      --ha-slider-indicator-color: var(--primary-color);
    }

    ha-button-menu ha-button[slot="trigger"] {
      line-height: 1;
      --mdc-theme-primary: var(--primary-text-color);
      --mdc-icon-size: 16px;
    }

    .info {
      flex: 1;
      display: flex;
      align-items: center;
      width: 100%;
      margin-right: 16px;
      margin-inline-end: 16px;
      margin-inline-start: initial;

      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }

    .pointer {
      cursor: pointer;
    }

    .secondary,
    .progress {
      color: var(--secondary-text-color);
    }

    .choose-player {
      flex: 1;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: 16px;
      gap: var(--ha-space-2);
    }

    .controls {
      height: 48px;
      padding-bottom: 4px;
    }

    .controls-progress {
      flex: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      direction: ltr;
    }

    .progress {
      display: flex;
      width: 100%;
      align-items: center;
    }

    .progress > div:first-child {
      margin-right: var(--ha-space-2);
    }

    .progress > div:last-child {
      margin-left: var(--ha-space-2);
    }

    .progress ha-slider {
      margin: 0 4px;
    }

    ha-dropdown.volume-menu::part(menu) {
      width: 220px;
      max-width: 220px;
      overflow: visible;
      padding: 15px 15px;
    }

    .volume-slider-container {
      width: 100%;
    }

    @media (pointer: coarse) {
      .volume-slider {
        pointer-events: none;
      }
    }

    .media-info {
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      padding-left: 16px;
      padding-inline-start: 16px;
      padding-inline-end: initial;
      width: 100%;
    }

    hui-marquee {
      font-size: 1.2em;
      margin: 0px 0 4px;
    }

    img {
      height: 100%;
    }

    .app img {
      height: 68px;
      margin: 16px 0 16px 16px;
    }

    :host([narrow]) {
      height: 57px;
    }

    :host([narrow]) .controls-progress {
      flex: unset;
      min-width: 48px;
    }

    :host([narrow]) .controls-progress.buffering {
      flex: 1;
    }

    :host([narrow]) .media-info {
      padding-left: 8px;
      padding-inline-start: 8px;
      padding-inline-end: initial;
    }

    :host([narrow]) .controls {
      display: flex;
      padding-bottom: 0;
      --mdc-icon-size: 30px;
    }

    :host([narrow]) .choose-player {
      padding-left: 0;
      padding-right: 8px;
      padding-inline-start: 0;
      padding-inline-end: 8px;
      min-width: 48px;
      flex: unset;
      justify-content: center;
    }

    :host([narrow]) .choose-player.browser {
      justify-content: flex-end;
    }

    :host([narrow]) ha-slider {
      position: absolute;
      top: -6px;
      left: 0;
      right: 0;
    }

    ha-dropdown-item.selected {
      font-weight: var(--ha-font-weight-bold);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bar-media-player": BarMediaPlayer;
  }
}
