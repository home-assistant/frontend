import "@material/mwc-button/mwc-button";
import "@material/mwc-linear-progress/mwc-linear-progress";
import type { LinearProgress } from "@material/mwc-linear-progress/mwc-linear-progress";
import "@material/mwc-list/mwc-list-item";
import {
  mdiChevronDown,
  mdiMonitor,
  mdiPause,
  mdiPlay,
  mdiPlayPause,
  mdiStop,
  mdiVolumeHigh,
} from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { until } from "lit/directives/until";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { domainIcon } from "../../common/entity/domain_icon";
import { supportsFeature } from "../../common/entity/supports-feature";
import "../../components/ha-button";
import "../../components/ha-button-menu";
import "../../components/ha-circular-progress";
import "../../components/ha-icon-button";
import { UNAVAILABLE } from "../../data/entity";
import {
  BROWSER_PLAYER,
  cleanupMediaTitle,
  computeMediaControls,
  computeMediaDescription,
  ControlButton,
  formatMediaTime,
  getCurrentProgress,
  handleMediaControlClick,
  MediaPlayerEntity,
  MediaPlayerEntityFeature,
  MediaPlayerItem,
  setMediaPlayerVolume,
} from "../../data/media-player";
import { ResolvedMediaSource } from "../../data/media_source";
import { showAlertDialog } from "../../dialogs/generic/show-dialog-box";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import type { HomeAssistant } from "../../types";
import "../lovelace/components/hui-marquee";
import {
  BrowserMediaPlayer,
  ERR_UNSUPPORTED_MEDIA,
} from "./browser-media-player";
import { debounce } from "../../common/util/debounce";

declare global {
  interface HASSDomEvents {
    "player-picked": { entityId: string };
  }
}

@customElement("ha-bar-media-player")
export class BarMediaPlayer extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @query("mwc-linear-progress") private _progressBar?: LinearProgress;

  @query("#CurrentProgress") private _currentProgress?: HTMLElement;

  @state() private _marqueeActive = false;

  @state() private _newMediaExpected = false;

  @state() private _browserPlayer?: BrowserMediaPlayer;

  private _progressInterval?: number;

  private _browserPlayerVolume = 0.8;

  public connectedCallback(): void {
    super.connectedCallback();

    const stateObj = this._stateObj;

    if (!stateObj) {
      return;
    }

    if (
      !this._progressInterval &&
      this._showProgressBar &&
      stateObj.state === "playing"
    ) {
      this._progressInterval = window.setInterval(
        () => this._updateProgressBar(),
        1000
      );
    }
  }

  public disconnectedCallback(): void {
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = undefined;
    }
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
            }).then(
              () => html`<ha-circular-progress active></ha-circular-progress>`
            )
          )}
        </div>
      `;
    }

    const isBrowser = this.entityId === BROWSER_PLAYER;
    const stateObj = this._stateObj;

    if (!stateObj) {
      return this._renderChoosePlayer(stateObj);
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
          ? html`<ha-circular-progress active></ha-circular-progress>`
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
                ? html`<mwc-linear-progress></mwc-linear-progress>`
                : html`
                    <div class="progress">
                      <div id="CurrentProgress"></div>
                      <mwc-linear-progress wide></mwc-linear-progress>
                      <div>${mediaDuration}</div>
                    </div>
                  `}
            `}
      </div>
      ${this._renderChoosePlayer(stateObj)}
    `;
  }

  private _renderChoosePlayer(stateObj: MediaPlayerEntity | undefined) {
    const isBrowser = this.entityId === BROWSER_PLAYER;
    return html`
    <div class="choose-player ${isBrowser ? "browser" : ""}">
      ${
        !this.narrow &&
        stateObj &&
        supportsFeature(stateObj, MediaPlayerEntityFeature.VOLUME_SET)
          ? html`
              <ha-button-menu y="0" x="76">
                <ha-icon-button
                  slot="trigger"
                  .path=${mdiVolumeHigh}
                ></ha-icon-button>
                <ha-slider
                  labeled
                  min="0"
                  max="100"
                  step="1"
                  .value=${stateObj.attributes.volume_level! * 100}
                  @change=${this._handleVolumeChange}
                >
                </ha-slider>
              </ha-button-menu>
            `
          : ""
      }

          <ha-button-menu >
            ${
              this.narrow
                ? html`
                    <ha-icon-button
                      slot="trigger"
                      .path=${isBrowser
                        ? mdiMonitor
                        : domainIcon(computeDomain(this.entityId), stateObj)}
                    ></ha-icon-button>
                  `
                : html`
                    <ha-button
                      slot="trigger"
                      .label=${this.narrow
                        ? ""
                        : `${
                            stateObj
                              ? computeStateName(stateObj)
                              : this.entityId
                          }
                `}
                    >
                      <ha-svg-icon
                        slot="icon"
                        .path=${isBrowser
                          ? mdiMonitor
                          : domainIcon(computeDomain(this.entityId), stateObj)}
                      ></ha-svg-icon>
                      <ha-svg-icon
                        slot="trailingIcon"
                        .path=${mdiChevronDown}
                      ></ha-svg-icon>
                    </ha-button>
                  `
            }
            <mwc-list-item
              .player=${BROWSER_PLAYER}
              ?selected=${isBrowser}
              @click=${this._selectPlayer}
            >
              ${this.hass.localize("ui.components.media-browser.web-browser")}
            </mwc-list-item>
            ${this._mediaPlayerEntities.map(
              (source) => html`
                <mwc-list-item
                  ?selected=${source.entity_id === this.entityId}
                  .disabled=${source.state === UNAVAILABLE}
                  .player=${source.entity_id}
                  @click=${this._selectPlayer}
                >
                  ${computeStateName(source)}
                </mwc-list-item>
              `
            )}
          </ha-button-menu>
        </div>
      </div>

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

    this._updateProgressBar();

    if (
      !this._progressInterval &&
      this._showProgressBar &&
      stateObj?.state === "playing"
    ) {
      this._progressInterval = window.setInterval(
        () => this._updateProgressBar(),
        1000
      );
    } else if (
      this._progressInterval &&
      (!this._showProgressBar || stateObj?.state !== "playing")
    ) {
      clearInterval(this._progressInterval);
      this._progressInterval = undefined;
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
    if (this._browserPlayer) {
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

    if (!this._progressBar || !this._currentProgress || !stateObj) {
      return;
    }

    if (!stateObj.attributes.media_duration) {
      this._progressBar.progress = 0;
      this._currentProgress.innerHTML = "";
      return;
    }

    const currentProgress = getCurrentProgress(stateObj);
    this._progressBar.progress =
      currentProgress / stateObj.attributes.media_duration;

    if (this._currentProgress) {
      this._currentProgress.innerHTML = formatMediaTime(currentProgress);
    }
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

  private _selectPlayer(ev: CustomEvent): void {
    const entityId = (ev.currentTarget as any).player;
    fireEvent(this, "player-picked", { entityId });
  }

  private async _handleVolumeChange(ev) {
    ev.stopPropagation();
    const value = Number(ev.target.value) / 100;
    if (this._browserPlayer) {
      this._browserPlayerVolume = value;
      this._browserPlayer.setVolume(value);
    } else {
      await setMediaPlayerVolume(this.hass, this.entityId, value);
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
        height: 100px;
        box-sizing: border-box;
        background: var(
          --ha-card-background,
          var(--card-background-color, white)
        );
        border-top: 1px solid var(--divider-color);
        padding-bottom: env(safe-area-inset-bottom);
      }

      mwc-linear-progress {
        width: 100%;
        padding: 0 4px;
        --mdc-theme-primary: var(--secondary-text-color);
      }

      mwc-button[slot="trigger"] {
        --mdc-theme-primary: var(--primary-text-color);
        --mdc-icon-size: 36px;
      }

      .info {
        flex: 1;
        display: flex;
        align-items: center;
        width: 100%;
        margin-right: 16px;
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

      mwc-linear-progress[wide] {
        margin: 0 4px;
      }

      .media-info {
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        padding-left: 16px;
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

      ha-button-menu mwc-button {
        line-height: 1;
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
      }

      :host([narrow]) .controls {
        display: flex;
        padding-bottom: 0;
        --mdc-icon-size: 30px;
      }

      :host([narrow]) .choose-player {
        padding-left: 0;
        padding-right: 8px;
        min-width: 48px;
        flex: unset;
        justify-content: center;
      }

      :host([narrow]) .choose-player.browser {
        justify-content: flex-end;
      }

      :host([narrow]) mwc-linear-progress {
        padding: 0;
        position: absolute;
        top: -4px;
        left: 0;
      }

      mwc-list-item[selected] {
        font-weight: bold;
      }

      ha-svg-icon[slot="trailingIcon"] {
        margin-inline-start: 8px !important;
        margin-inline-end: 0px !important;
        direction: var(--direction);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bar-media-player": BarMediaPlayer;
  }
}
