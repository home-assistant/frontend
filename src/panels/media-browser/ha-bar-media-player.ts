import "@material/mwc-button/mwc-button";
import "@material/mwc-linear-progress/mwc-linear-progress";
import type { LinearProgress } from "@material/mwc-linear-progress/mwc-linear-progress";
import "@material/mwc-list/mwc-list-item";
import {
  mdiChevronDown,
  mdiDevices,
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
import { computeStateDomain } from "../../common/entity/compute_state_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import { supportsFeature } from "../../common/entity/supports-feature";
import { navigate } from "../../common/navigate";
import "../../components/ha-button-menu";
import "../../components/ha-icon-button";
import { UNAVAILABLE_STATES } from "../../data/entity";
import {
  BROWSER_PLAYER,
  computeMediaDescription,
  formatMediaTime,
  getCurrentProgress,
  MediaPlayerEntity,
  SUPPORT_BROWSE_MEDIA,
  SUPPORT_PAUSE,
  SUPPORT_PLAY,
  SUPPORT_STOP,
} from "../../data/media-player";
import type { HomeAssistant } from "../../types";
import "../lovelace/components/hui-marquee";

@customElement("ha-bar-media-player")
class BarMediaPlayer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @query("mwc-linear-progress") private _progressBar?: LinearProgress;

  @query("#CurrentProgress") private _currentProgress?: HTMLElement;

  @state() private _marqueeActive = false;

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
  }

  protected render(): TemplateResult {
    const choosePlayerElement = html`
      <div class="choose-player">
        <ha-button-menu corner="BOTTOM_START">
          <mwc-button
            slot="trigger"
            class="trigger"
            .label=${this.narrow
              ? ""
              : `${
                  this._stateObj
                    ? computeStateName(this._stateObj)
                    : BROWSER_PLAYER
                }
                `}
          >
            <ha-svg-icon slot="icon" .path=${mdiDevices}></ha-svg-icon>
            <ha-svg-icon
              slot="trailingIcon"
              .path=${mdiChevronDown}
            ></ha-svg-icon>
          </mwc-button>
          <mwc-list-item .player=${BROWSER_PLAYER} @click=${this._selectPlayer}
            >${this.hass.localize(
              "ui.components.media-browser.web-browser"
            )}</mwc-list-item
          >
          ${this._mediaPlayerEntities.map(
            (source) => html`
              <mwc-list-item
                ?selected=${source.entity_id === this.entityId}
                .disabled=${UNAVAILABLE_STATES.includes(source.state)}
                .player=${source.entity_id}
                @click=${this._selectPlayer}
                >${computeStateName(source)}</mwc-list-item
              >
            `
          )}
        </ha-button-menu>
      </div>
    `;

    if (!this._stateObj) {
      return choosePlayerElement;
    }

    const stateObj = this._stateObj;
    const control =
      (stateObj.state === "playing" &&
        (supportsFeature(stateObj, SUPPORT_PAUSE) ||
          supportsFeature(stateObj, SUPPORT_STOP))) ||
      ((stateObj.state === "paused" || stateObj.state === "idle") &&
        supportsFeature(stateObj, SUPPORT_PLAY)) ||
      (stateObj.state === "on" &&
        (supportsFeature(stateObj, SUPPORT_PLAY) ||
          supportsFeature(stateObj, SUPPORT_PAUSE)))
        ? {
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
          }
        : {};
    const mediaDescription = computeMediaDescription(stateObj);
    const mediaDuration = formatMediaTime(stateObj!.attributes.media_duration!);

    return html`
      <div class="info">
        ${this._image
          ? html`<img src=${this.hass.hassUrl(this._image)} />`
          : ""}
        ${mediaDescription || stateObj.attributes.media_title
          ? html`
              <div class="media-info">
                <hui-marquee
                  .text=${stateObj.attributes.media_title || mediaDescription}
                  .active=${this._marqueeActive}
                  @mouseover=${this._marqueeMouseOver}
                  @mouseleave=${this._marqueeMouseLeave}
                ></hui-marquee>
                ${stateObj.attributes.media_title ? mediaDescription : ""}
              </div>
            `
          : ""}
      </div>
      <div class="controls-progress">
        <div class="controls">
          ${!control
            ? ""
            : html`
                <ha-icon-button
                  .label=${this.hass.localize(
                    `ui.card.media_player.${control.action}`
                  )}
                  .path=${control.icon}
                  action=${control.action!}
                  @click=${this._handleClick}
                >
                </ha-icon-button>
              `}
        </div>
        ${this._showProgressBar
          ? html`
              <div class="progress">
                <div id="CurrentProgress"></div>
                <mwc-linear-progress determinate></mwc-linear-progress>
                <div>${mediaDuration}</div>
              </div>
            `
          : ""}
      </div>
      ${choosePlayerElement}
    `;
  }

  protected updated(changedProps: PropertyValues) {
    if (!this.hass || !this._stateObj || !changedProps.has("hass")) {
      return;
    }

    const stateObj = this._stateObj;

    this._updateProgressBar();

    if (
      !this._progressInterval &&
      this._showProgressBar &&
      stateObj.state === "playing"
    ) {
      this._progressInterval = window.setInterval(
        () => this._updateProgressBar(),
        1000
      );
    } else if (
      this._progressInterval &&
      (!this._showProgressBar || stateObj.state !== "playing")
    ) {
      clearInterval(this._progressInterval);
      this._progressInterval = undefined;
    }
  }

  private get _stateObj(): MediaPlayerEntity | undefined {
    return this.hass!.states[this.entityId] as MediaPlayerEntity;
  }

  private get _showProgressBar() {
    if (!this.hass || this.narrow) {
      return false;
    }

    const stateObj = this._stateObj;

    if (!stateObj) {
      return false;
    }

    return (
      (stateObj.state === "playing" || stateObj.state === "paused") &&
      "media_duration" in stateObj.attributes &&
      "media_position" in stateObj.attributes
    );
  }

  private get _image() {
    if (!this.hass) {
      return undefined;
    }

    const stateObj = this._stateObj;

    if (!stateObj) {
      return undefined;
    }

    return (
      stateObj.attributes.entity_picture_local ||
      stateObj.attributes.entity_picture
    );
  }

  private get _mediaPlayerEntities() {
    return Object.values(this.hass!.states).filter((entity) => {
      if (
        computeStateDomain(entity) === "media_player" &&
        supportsFeature(entity, SUPPORT_BROWSE_MEDIA)
      ) {
        return true;
      }

      return false;
    });
  }

  private _updateProgressBar(): void {
    if (this._progressBar && this._stateObj?.attributes.media_duration) {
      const currentProgress = getCurrentProgress(this._stateObj);
      this._progressBar.progress =
        currentProgress / this._stateObj!.attributes.media_duration;

      this._currentProgress!.innerHTML = formatMediaTime(currentProgress);
    }
  }

  private _handleClick(e: MouseEvent): void {
    const action = (e.currentTarget! as HTMLElement).getAttribute("action")!;
    this.hass!.callService("media_player", action, {
      entity_id: this.entityId,
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

  private _selectPlayer(ev: CustomEvent): void {
    const entityId = (ev.currentTarget as any).player;
    navigate(`/media-browser/${entityId}`, { replace: true });
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
      }

      .trigger {
        --mdc-theme-primary: var(--primary-text-color);
        --mdc-icon-size: 36px;
      }

      .info {
        flex: 1;
        display: flex;
        align-items: center;
        width: 100%;
        padding: 8px 16px;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
      }

      .choose-player {
        flex: 1;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 16px;
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
        --mdc-theme-primary: var(--accent-color);
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
        max-height: 84px;
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
      }

      :host([narrow]) .choose-player {
        padding-left: 0;
        min-width: 48px;
        flex: unset;
      }

      :host([narrow]) img {
        max-height: 64px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bar-media-player": BarMediaPlayer;
  }
}
