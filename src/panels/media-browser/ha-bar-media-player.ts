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
} from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { domainIcon } from "../../common/entity/domain_icon";
import { supportsFeature } from "../../common/entity/supports-feature";
import "../../components/ha-button-menu";
import "../../components/ha-icon-button";
import { UNAVAILABLE_STATES } from "../../data/entity";
import {
  BROWSER_PLAYER,
  cleanupMediaTitle,
  computeMediaControls,
  computeMediaDescription,
  formatMediaTime,
  getCurrentProgress,
  MediaPlayerEntity,
  MediaPlayerItem,
  SUPPORT_BROWSE_MEDIA,
  SUPPORT_PAUSE,
  SUPPORT_PLAY,
  SUPPORT_STOP,
} from "../../data/media-player";
import type { HomeAssistant } from "../../types";
import "../lovelace/components/hui-marquee";
import { BrowserMediaPlayer } from "./browser-media-player";

declare global {
  interface HASSDomEvents {
    "player-picked": { entityId: string };
  }
}

@customElement("ha-bar-media-player")
class BarMediaPlayer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @query("mwc-linear-progress") private _progressBar?: LinearProgress;

  @query("#CurrentProgress") private _currentProgress?: HTMLElement;

  @state() private _marqueeActive = false;

  @state() private _browserPlayer?: BrowserMediaPlayer;

  private _progressInterval?: number;

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

    if (this._browserPlayer) {
      this._browserPlayer.stop();
      this._browserPlayer = undefined;
    }
  }

  public async playItem(item: MediaPlayerItem) {
    if (this.entityId !== BROWSER_PLAYER) {
      throw Error("Only browser supported");
    }
    if (this._browserPlayer) {
      this._browserPlayer.stop();
    }
    this._browserPlayer = new BrowserMediaPlayer(this.hass, item, () =>
      this.requestUpdate("_browserPlayer")
    );
    await this._browserPlayer.initialize();
  }

  protected render(): TemplateResult {
    const isBrowser = this.entityId === BROWSER_PLAYER;
    const stateObj = this._stateObj;
    const controls = !stateObj
      ? undefined
      : !this.narrow
      ? computeMediaControls(stateObj)
      : (stateObj.state === "playing" &&
          (supportsFeature(stateObj, SUPPORT_PAUSE) ||
            supportsFeature(stateObj, SUPPORT_STOP))) ||
        ((stateObj.state === "paused" || stateObj.state === "idle") &&
          supportsFeature(stateObj, SUPPORT_PLAY)) ||
        (stateObj.state === "on" &&
          (supportsFeature(stateObj, SUPPORT_PLAY) ||
            supportsFeature(stateObj, SUPPORT_PAUSE)))
      ? [
          {
            icon:
              stateObj.state === "on"
                ? mdiPlayPause
                : stateObj.state !== "playing"
                ? mdiPlay
                : supportsFeature(stateObj, SUPPORT_PAUSE)
                ? mdiPause
                : mdiStop,
            action:
              stateObj.state !== "playing"
                ? "media_play"
                : supportsFeature(stateObj, SUPPORT_PAUSE)
                ? "media_pause"
                : "media_stop",
          },
        ]
      : [{}];
    const mediaDescription = stateObj ? computeMediaDescription(stateObj) : "";
    const mediaDuration = formatMediaTime(stateObj?.attributes.media_duration);
    const mediaTitleClean = cleanupMediaTitle(
      stateObj?.attributes.media_title || ""
    );

    const mediaArt = stateObj
      ? stateObj.attributes.entity_picture_local ||
        stateObj.attributes.entity_picture
      : undefined;

    return html`
      <div
        class="info ${!isBrowser ? "pointer" : ""}"
        @click=${this._openMoreInfo}
      >
        ${mediaArt ? html`<img src=${this.hass.hassUrl(mediaArt)} />` : ""}
        <div class="media-info">
          <hui-marquee
            .text=${mediaTitleClean ||
            mediaDescription ||
            this.hass.localize(`ui.card.media_player.nothing_playing`)}
            .active=${this._marqueeActive}
            @mouseover=${this._marqueeMouseOver}
            @mouseleave=${this._marqueeMouseLeave}
          ></hui-marquee>
          <span class="secondary">
            ${mediaTitleClean ? mediaDescription : ""}
          </span>
        </div>
      </div>
      <div class="controls-progress">
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
                    @click=${this._handleClick}
                  >
                  </ha-icon-button>
                `
              )}
        </div>
        ${this.narrow
          ? html`<mwc-linear-progress></mwc-linear-progress>`
          : html`
              <div class="progress">
                <div id="CurrentProgress"></div>
                <mwc-linear-progress wide></mwc-linear-progress>
                <div>${mediaDuration}</div>
              </div>
            `}
      </div>
      <div class="choose-player ${isBrowser ? "browser" : ""}">
        <ha-button-menu corner="BOTTOM_START">
          ${this.narrow
            ? html`
                <ha-icon-button
                  slot="trigger"
                  .path=${isBrowser
                    ? mdiMonitor
                    : domainIcon(computeDomain(this.entityId), stateObj)}
                ></ha-icon-button>
              `
            : html`
                <mwc-button
                  slot="trigger"
                  .label=${this.narrow
                    ? ""
                    : `${stateObj ? computeStateName(stateObj) : this.entityId}
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
                </mwc-button>
              `}
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
                .disabled=${UNAVAILABLE_STATES.includes(source.state)}
                .player=${source.entity_id}
                @click=${this._selectPlayer}
              >
                ${computeStateName(source)}
              </mwc-list-item>
            `
          )}
        </ha-button-menu>
      </div>
    `;
  }

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);
    if (
      changedProps.has("entityId") &&
      this.entityId !== BROWSER_PLAYER &&
      this._browserPlayer
    ) {
      this._browserPlayer?.stop();
      this._browserPlayer = undefined;
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
        supportsFeature(entity, SUPPORT_BROWSE_MEDIA)
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

  private _handleClick(e: MouseEvent): void {
    const action = (e.currentTarget! as HTMLElement).getAttribute("action")!;

    if (!this._browserPlayer) {
      this.hass!.callService("media_player", action, {
        entity_id: this.entityId,
      });
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

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
        min-height: 100px;
        background: var(
          --ha-card-background,
          var(--card-background-color, white)
        );
        border-top: 1px solid var(--divider-color);
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
        max-height: 100px;
      }

      ha-button-menu mwc-button {
        line-height: 1;
      }

      :host([narrow]) {
        min-height: 80px;
        max-height: 80px;
      }

      :host([narrow]) .controls-progress {
        flex: unset;
        min-width: 48px;
      }

      :host([narrow]) .controls {
        display: flex;
        padding-bottom: 0;
      }

      :host([narrow]) .choose-player {
        padding-left: 0;
        min-width: 48px;
        flex: unset;
        justify-content: center;
      }

      :host([narrow]) .choose-player.browser {
        justify-content: flex-end;
        width: 100%;
      }

      :host([narrow]) img {
        max-height: 80px;
      }

      :host([narrow]) .blank-image {
        height: 80px;
        width: 80px;
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bar-media-player": BarMediaPlayer;
  }
}
