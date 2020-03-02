import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { HassEntity } from "home-assistant-js-websocket";
import { install } from "resize-observer";
import * as Vibrant from "node-vibrant";
import "@polymer/paper-icon-button/paper-icon-button";

import "../../../components/ha-card";
import "../../../components/ha-icon";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { debounce } from "../../../common/util/debounce";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { supportsFeature } from "../../../common/entity/supports-feature";
import {
  OFF_STATES,
  SUPPORT_PAUSE,
  SUPPORT_TURN_ON,
  SUPPORT_TURN_OFF,
  SUPPORT_PREVIOUS_TRACK,
  SUPPORT_NEXT_TRACK,
  SUPPORTS_PLAY,
  fetchMediaPlayerThumbnailWithCache,
  SUPPORT_STOP,
  SUPPORT_SEEK,
  CONTRAST_RATIO,
} from "../../../data/media-player";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { HomeAssistant, MediaEntity } from "../../../types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { MediaControlCardConfig } from "./types";
import { UNAVAILABLE } from "../../../data/entity";

function luminanace(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function contrast(rgb1: number[], rgb2: number[]): number {
  const lum1 = luminanace(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = luminanace(rgb2[0], rgb2[1], rgb2[2]);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

@customElement("hui-media-control-card")
export class HuiMediaControlCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      /* webpackChunkName: "hui-media-control-card-editor" */ "../editor/config-elements/hui-media-control-card-editor"
    );
    return document.createElement("hui-media-control-card-editor");
  }

  public static getStubConfig(): object {
    return { entity: "" };
  }

  @property() public hass?: HomeAssistant;
  @property() private _config?: MediaControlCardConfig;
  @property() private _image?: string;
  @property() private foregroundColor?: string;
  @property() private backgroundColor?: string;
  @property() private _narrow: boolean = false;
  @property() private _veryNarrow: boolean = false;
  @property() private _veryVeryNarrow: boolean = false;
  private _resizeObserver?: ResizeObserver;
  private _debouncedResizeListener = debounce(
    () => {
      this._narrow = this.offsetWidth < 475 ? true : false;
      this._veryNarrow = this.offsetWidth < 400 ? true : false;
      this._veryVeryNarrow = this.offsetWidth < 350 ? true : false;
    },
    100,
    false
  );

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: MediaControlCardConfig): void {
    if (!config.entity || config.entity.split(".")[0] !== "media_player") {
      throw new Error("Specify an entity from within the media_player domain.");
    }

    this._config = { theme: "default", ...config };
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }
    const stateObj = this.hass.states[this._config.entity] as MediaEntity;

    if (!stateObj) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this._config.entity
          )}</hui-warning
        >
      `;
    }

    const picture = this._image || "../static/images/card_media_player_bg.png";

    return html`
      <ha-card>
        <div
          class="background ${classMap({
            "no-image": !this._image,
            "very-narrow": this._veryNarrow,
          })}"
        >
          <div
            class="color-block"
            style="background-color: ${this.backgroundColor}"
          ></div>
          <div
            class="color-gradient"
            style="background-image: linear-gradient(to right, ${this
              .backgroundColor}, transparent);"
          ></div>
          <div
            class="image"
            style="background-image: url(${this.hass.hassUrl(picture)})"
          ></div>
        </div>
        <div
          class="player ${classMap({
            "no-image": !this._image,
            "very-narrow": this._veryNarrow,
            "very-very-narrow": this._veryVeryNarrow,
          })}"
          style="color: ${this.foregroundColor}"
        >
          <div class="top-info">
            <div>
              ${!stateObj.attributes.icon
                ? ""
                : html`
                    <ha-icon
                      class="icon"
                      .icon="${stateObj.attributes.icon}"
                    ></ha-icon>
                  `}
              ${this._config!.name ||
                computeStateName(this.hass!.states[this._config!.entity])}
            </div>
            <div>
              <paper-icon-button
                icon="hass:dots-vertical"
                class="more-info"
                @click=${this._handleMoreInfo}
              ></paper-icon-button>
            </div>
          </div>
          <div class="title-controls">
            <div class="media-info">
              <div class="title">
                ${stateObj.attributes.media_title ||
                  this.hass.localize(`state.media_player.${stateObj.state}`) ||
                  this.hass.localize(`state.default.${stateObj.state}`) ||
                  stateObj.state}
              </div>
              ${this._computeSecondaryTitle(stateObj)}
            </div>
            ${this._veryVeryNarrow
              ? ""
              : html`
                  <div class="controls">
                    <div>
                      ${(stateObj.state === "off" &&
                        !supportsFeature(stateObj, SUPPORT_TURN_ON)) ||
                      (stateObj.state === "on" &&
                        !supportsFeature(stateObj, SUPPORT_TURN_OFF)) ||
                      this._veryNarrow
                        ? ""
                        : html`
                            <paper-icon-button
                              icon="hass:power"
                              .action=${stateObj.state === "off"
                                ? "turn_on"
                                : "turn_off"}
                              @click=${this._handleClick}
                            ></paper-icon-button>
                          `}
                    </div>
                    ${OFF_STATES.includes(stateObj.state)
                      ? ""
                      : html`
                          <div class="playback-controls">
                            ${!supportsFeature(stateObj, SUPPORT_PREVIOUS_TRACK)
                              ? ""
                              : html`
                                  <paper-icon-button
                                    icon="hass:skip-previous"
                                    .action=${"media_previous_track"}
                                    @click=${this._handleClick}
                                  ></paper-icon-button>
                                `}
                            ${(stateObj.state !== "playing" &&
                              !supportsFeature(stateObj, SUPPORTS_PLAY)) ||
                            stateObj.state === UNAVAILABLE ||
                            (stateObj.state === "playing" &&
                              !supportsFeature(stateObj, SUPPORT_PAUSE) &&
                              !supportsFeature(stateObj, SUPPORT_STOP))
                              ? ""
                              : html`
                                  <paper-icon-button
                                    class="playPauseButton"
                                    .icon=${stateObj.state !== "playing"
                                      ? "hass:play"
                                      : supportsFeature(stateObj, SUPPORT_PAUSE)
                                      ? "hass:pause"
                                      : "hass:stop"}
                                    .action=${"media_play_pause"}
                                    @click=${this._handleClick}
                                  ></paper-icon-button>
                                `}
                            ${!supportsFeature(stateObj, SUPPORT_NEXT_TRACK)
                              ? ""
                              : html`
                                  <paper-icon-button
                                    icon="hass:skip-next"
                                    .action=${"media_next_track"}
                                    @click=${this._handleClick}
                                  ></paper-icon-button>
                                `}
                          </div>
                        `}
                  </div>
                `}
          </div>
          ${OFF_STATES.includes(stateObj.state) ||
          !stateObj.attributes.media_duration ||
          !stateObj.attributes.media_position ||
          this._narrow
            ? ""
            : html`
                <paper-progress
                  .max="${stateObj.attributes.media_duration}"
                  .value="${stateObj.attributes.media_position}"
                  class="progress ${classMap({
                    seek: supportsFeature(stateObj, SUPPORT_SEEK),
                  })}"
                  style="--paper-progress-active-color: ${this
                    .foregroundColor};"
                  @click=${(e: MouseEvent) => this._handleSeek(e, stateObj)}
                ></paper-progress>
              `}
        </div>
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected firstUpdated(): void {
    this._attachObserver();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass || !changedProps.has("hass")) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | MediaControlCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }

    const oldImage =
      oldHass?.states[this._config.entity]?.attributes.entity_picture;
    const newImage = this.hass.states[this._config.entity]?.attributes
      .entity_picture;

    if (!newImage) {
      this._image = newImage;
      this.foregroundColor = undefined;
      this.backgroundColor = undefined;
      return;
    }

    if (newImage === oldImage) {
      this._image = newImage;
      return;
    }

    fetchMediaPlayerThumbnailWithCache(this.hass, this._config.entity)
      .then(({ content_type, content }) => {
        this._image = `data:${content_type};base64,${content}`;
        this._setColors();
      })
      .catch(() => {
        this._image = undefined;
        this.foregroundColor = undefined;
        this.backgroundColor = undefined;
      });
  }

  private _attachObserver(): void {
    if (typeof ResizeObserver !== "function") {
      install();
    }

    this._resizeObserver = new ResizeObserver(() =>
      this._debouncedResizeListener()
    );

    this._resizeObserver.observe(this);
  }

  private _computeSecondaryTitle(stateObj: HassEntity): string {
    let secondaryTitle: string;

    switch (stateObj.attributes.media_content_type) {
      case "music":
        secondaryTitle = stateObj.attributes.media_artist;
        break;
      case "playlist":
        secondaryTitle = stateObj.attributes.media_playlist;
        break;
      case "tvshow":
        secondaryTitle = stateObj.attributes.media_series_title;
        if (stateObj.attributes.media_season) {
          secondaryTitle += " S" + stateObj.attributes.media_season;

          if (stateObj.attributes.media_episode) {
            secondaryTitle += "E" + stateObj.attributes.media_episode;
          }
        }
        break;
      default:
        secondaryTitle = stateObj.attributes.app_name
          ? stateObj.attributes.app_name
          : "";
    }

    return secondaryTitle;
  }

  private _handleMoreInfo(): void {
    fireEvent(this, "hass-more-info", {
      entityId: this._config!.entity,
    });
  }

  private _handleClick(e: MouseEvent): void {
    this.hass!.callService("media_player", (e.currentTarget! as any).action, {
      entity_id: this._config!.entity,
    });
  }

  private _handleSeek(e: MouseEvent, stateObj: MediaEntity): void {
    if (!supportsFeature(stateObj, SUPPORT_SEEK)) {
      return;
    }

    const percent = e.offsetX / this.offsetWidth;
    const position = (e.currentTarget! as any).max * percent;

    this.hass!.callService("media_player", "media_seek", {
      entity_id: this._config!.entity,
      seek_position: position,
    });
  }

  private _setColors(): void {
    if (!this._image) {
      return;
    }

    Vibrant.from(this._image)
      .quality(1)
      .getPalette()
      .then((palette) => {
        if (!palette.DarkMuted) {
          this.foregroundColor = undefined;
          this.backgroundColor = undefined;
          return;
        }

        this.backgroundColor = palette.DarkMuted.getHex();

        if (
          !palette.Vibrant ||
          this._getContrastRatio(
            palette.Vibrant.getRgb(),
            palette.DarkMuted.getRgb()
          ) < CONTRAST_RATIO
        ) {
          this.foregroundColor = palette.DarkMuted.getBodyTextColor();
          return;
        }

        this.foregroundColor = palette.Vibrant.getHex();
      })
      .catch((err) => {
        // tslint:disable-next-line:no-console
        console.log("Error getting Image Colors", err);
        this.foregroundColor = undefined;
        this.backgroundColor = undefined;
      });
  }

  private _getContrastRatio(rgb1: number[], rgb2: number[]): number {
    return Math.round((contrast(rgb1, rgb2) + Number.EPSILON) * 100) / 100;
  }

  static get styles(): CSSResult {
    return css`
      .background {
        display: flex;
        min-height: 120px;
      }

      .color-block {
        background-color: var(--primary-color);
        transition: background-color 0.8s;
        padding: 16px;
        box-sizing: border-box;
        width: 60%;
      }

      .color-gradient {
        position: absolute;
        background-image: linear-gradient(
          to right,
          var(--primary-color),
          transparent
        );
        left: 60%;
        height: 100%;
        width: 40%;
      }

      .image {
        display: block;
        width: 40%;
        transition: all 0.5;
        padding-bottom: 40%;
        background-color: var(--primary-color);
        background-position: center;
        background-size: cover;
        background-repeat: no-repeat;
        transition: all 0.8s;
      }

      .player {
        position: absolute;
        top: 0;
        left: 0;
        padding: 16px;
        height: 100%;
        width: 100%;
        box-sizing: border-box;
        color: var(--text-primary-color);
      }

      .icon {
        width: 18px;
      }

      .title-controls {
        width: 60%;
      }

      .controls {
        padding: 8px 8px 8px 0;
        display: flex;
        justify-content: flex-start;
        align-items: center;
        transition: opacity 0.8s;
        opacity: 1;
      }

      .controls > div {
        display: flex;
        align-items: center;
      }

      .controls paper-icon-button {
        width: 44px;
        height: 44px;
      }

      paper-icon-button {
        opacity: var(--dark-primary-opacity);
      }

      .playPauseButton {
        width: 56px !important;
        height: 56px !important;
      }

      .top-info {
        display: flex;
        justify-content: space-between;
      }

      .more-info {
        padding-top: 0;
      }

      .title {
        font-size: 1.2em;
        margin: 0px 0 4px;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
      }

      .progress {
        width: 100%;
        height: var(--paper-progress-height, 4px);
        margin-top: 4px;
        border-radius: calc(var(--paper-progress-height, 4px) / 2);
        --paper-progress-active-color: var(--accent-color);
        --paper-progress-container-color: rgba(200, 200, 200, 0.5);
      }

      .no-image .image {
        background-color: var(--primary-color);
        background-size: initial;
        background-repeat: no-repeat;
        background-position: center center;
        padding-bottom: 0;
      }

      .no-image .color-gradient {
        display: none;
      }

      .no-image .title-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }

      .no-image .controls {
        padding: 0;
      }

      .very-narrow .title-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 70%;
      }

      .very-narrow .media-info {
        width: 50%;
      }

      .very-narrow .controls {
        padding: 0;
      }

      .very-narrow paper-icon-button {
        width: 40px;
        height: 40px;
      }

      .very-narrow .playPauseButton {
        width: 50px !important;
        height: 50px !important;
      }

      .very-narrow .color-block {
        width: 70%;
      }

      .very-narrow .color-gradient {
        width: 30%;
        left: 70%;
      }

      .very-narrow .image {
        width: 30%;
        padding-bottom: 30%;
      }

      .very-very-narrow .media-info {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-control-card": HuiMediaControlCard;
  }
}
