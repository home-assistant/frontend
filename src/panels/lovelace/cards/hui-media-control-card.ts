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
import { styleMap } from "lit-html/directives/style-map";
import { HassEntity } from "home-assistant-js-websocket";
import * as Vibrant from "node-vibrant";
import { Palette } from "node-vibrant/lib/color";
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
  SUPPORT_PREVIOUS_TRACK,
  SUPPORT_NEXT_TRACK,
  SUPPORTS_PLAY,
  SUPPORT_STOP,
  SUPPORT_SEEK,
  CONTRAST_RATIO,
  getCurrentProgress,
} from "../../../data/media-player";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { HomeAssistant, MediaEntity } from "../../../types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { MediaControlCardConfig } from "./types";
import { UNAVAILABLE } from "../../../data/entity";
import { stateIcon } from "../../../common/entity/state_icon";
import { contrast } from "../common/color/contrast";
import { LovelaceConfig } from "../../../data/lovelace";
import { findEntities } from "../common/find-entites";

function getContrastRatio(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  return Math.round((contrast(rgb1, rgb2) + Number.EPSILON) * 100) / 100;
}

@customElement("hui-media-control-card")
export class HuiMediaControlCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      /* webpackChunkName: "hui-media-control-card-editor" */ "../editor/config-elements/hui-media-control-card-editor"
    );
    return document.createElement("hui-media-control-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    lovelaceConfig: LovelaceConfig,
    entities?: string[],
    entitiesFill?: string[]
  ): object {
    const includeDomains = ["media_player"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      lovelaceConfig,
      maxEntities,
      entities,
      entitiesFill,
      includeDomains
    );

    return { entity: foundEntities[0] || "" };
  }

  @property() public hass?: HomeAssistant;
  @property() private _config?: MediaControlCardConfig;
  @property() private _foregroundColor?: string;
  @property() private _backgroundColor?: string;
  @property() private _narrow: boolean = false;
  @property() private _veryNarrow: boolean = false;
  @property() private _cardHeight: number = 0;
  @property() private _progressValue?: number;
  private _progressInterval?: number;
  private _resizeObserver?: ResizeObserver;
  private _debouncedResizeListener = debounce(
    () => {
      this._narrow = this.offsetWidth < 350;
      this._veryNarrow = this.offsetWidth < 300;
      this._cardHeight = this.offsetHeight;
    },
    250,
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

    const imageStyle = {
      "background-image": `url(${this.hass.hassUrl(picture)})`,
      width: `${this._image ? `${this._cardHeight}px` : "50%"}`,
    };

    const gradientStyle = {
      "background-image": `linear-gradient(to right, ${this._backgroundColor}, transparent)`,
      width: `${this._cardHeight}px`,
    };

    return html`
      <ha-card>
        <div
          class="background ${classMap({
            "no-image": !this._image,
            off: OFF_STATES.includes(stateObj.state),
          })}"
        >
          <div
            class="color-block"
            style="background-color: ${this._backgroundColor}"
          ></div>
          <div class="image" style=${styleMap(imageStyle)}></div>
          ${!this._image
            ? ""
            : html`
                <div
                  class="color-gradient"
                  style=${styleMap(gradientStyle)}
                ></div>
              `}
        </div>
        <div
          class="player ${classMap({
            "no-image": !this._image,
            narrow: this._narrow,
            "very-narrow": this._veryNarrow,
            off: OFF_STATES.includes(stateObj.state),
            "no-progress":
              !stateObj.attributes.media_duration ||
              !stateObj.attributes.media_position,
          })}"
          style="color: ${this._foregroundColor}"
        >
          <div class="top-info">
            <div class="icon-name">
              <ha-icon class="icon" .icon="${stateIcon(stateObj)}"></ha-icon>
              <div>
                ${this._config!.name ||
                  computeStateName(this.hass!.states[this._config!.entity])}
              </div>
            </div>
            <div>
              <paper-icon-button
                icon="hass:dots-vertical"
                class="more-info"
                @click=${this._handleMoreInfo}
              ></paper-icon-button>
            </div>
          </div>
          <div
            class="title-controls"
            style="padding-right: ${OFF_STATES.includes(stateObj.state)
              ? 0
              : this._cardHeight - 40}px"
          >
            <div class="media-info">
              <div class="title">
                ${OFF_STATES.includes(stateObj.state)
                  ? this.hass.localize(
                      `state.media_player.${stateObj.state}`
                    ) ||
                    this.hass.localize(`state.default.${stateObj.state}`) ||
                    stateObj.state
                  : stateObj.attributes.media_title ||
                    this._computeSecondaryTitle(stateObj)}
              </div>
              ${!stateObj.attributes.media_title &&
              !OFF_STATES.includes(stateObj.state)
                ? ""
                : this._computeSecondaryTitle(stateObj)}
            </div>
            ${this._veryNarrow && !OFF_STATES.includes(stateObj.state)
              ? ""
              : html`
                  <div class="controls">
                    <div>
                      ${(stateObj.state === "off" &&
                        !supportsFeature(stateObj, SUPPORT_TURN_ON)) ||
                      !OFF_STATES.includes(stateObj.state)
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
          ${!this._showProgressBar
            ? ""
            : html`
                <paper-progress
                  .max="${stateObj.attributes.media_duration}"
                  .value="${this._progressValue}"
                  class="progress"
                  style="--paper-progress-active-color: ${this
                    ._foregroundColor || "var(--accent-color)"}"
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

    if (!this._progressInterval && this._showProgressBar) {
      this._progressInterval = window.setInterval(() => {
        this._getProgressValue();
      }, 1000);
    }

    const oldImage =
      oldHass?.states[this._config.entity]?.attributes.entity_picture_local ||
      oldHass?.states[this._config.entity]?.attributes.entity_picture;

    if (!this._image) {
      this._foregroundColor = undefined;
      this._backgroundColor = undefined;
      return;
    }

    if (this._image !== oldImage) {
      this._setColors();
      return;
    }
  }

  private get _image() {
    if (!this.hass || !this._config) {
      return undefined;
    }

    return (
      this.hass.states[this._config.entity]?.attributes.entity_picture_local ||
      this.hass.states[this._config.entity]?.attributes.entity_picture
    );
  }

  private get _showProgressBar() {
    if (!this.hass || !this._config) {
      return false;
    }

    return (
      !OFF_STATES.includes(this.hass.states[this._config.entity].state) &&
      this.hass.states[this._config.entity].attributes.media_duration &&
      this.hass.states[this._config.entity].attributes.media_position &&
      !this._narrow
    );
  }

  private _attachObserver(): void {
    if (typeof ResizeObserver !== "function") {
      import("resize-observer").then((modules) => {
        modules.install();
        this._attachObserver();
      });
      return;
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

    const progressWidth = (this.shadowRoot!.querySelector(
      "paper-progress"
    ) as HTMLElement).offsetWidth;

    const percent = e.offsetX / progressWidth;
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

    const image: string | HTMLImageElement = this._image;

    Vibrant.from(image)
      .quality(1)
      .getPalette()
      .then((palette: Palette) => {
        if (!palette.DarkMuted) {
          this._foregroundColor = undefined;
          this._backgroundColor = undefined;
          return;
        }

        this._backgroundColor = palette.DarkMuted.getHex();

        if (
          !palette.Vibrant ||
          getContrastRatio(
            palette.Vibrant.getRgb(),
            palette.DarkMuted.getRgb()
          ) < CONTRAST_RATIO
        ) {
          this._foregroundColor = palette.DarkMuted.getBodyTextColor();
          return;
        }

        this._foregroundColor = palette.Vibrant.getHex();
      })
      .catch((err: any) => {
        // tslint:disable-next-line:no-console
        console.error("Error getting Image Colors", err);
        this._foregroundColor = undefined;
        this._backgroundColor = undefined;
      });
  }

  private _getProgressValue(): void {
    if (!this._showProgressBar) {
      this._progressInterval = undefined;
      this._progressValue = undefined;
      return;
    }

    this._progressValue = getCurrentProgress(
      this.hass!.states[this._config!.entity]
    );
  }

  static get styles(): CSSResult {
    return css`
      ha-card {
        overflow: hidden;
      }

      .background {
        display: flex;
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        transition: filter 0.8s;
      }

      .color-block {
        background-color: var(--primary-color);
        transition: background-color 0.8s;
        width: 100%;
      }

      .color-gradient {
        position: absolute;
        background-image: linear-gradient(
          to right,
          var(--primary-color),
          transparent
        );
        height: 100%;
        right: 0;
        transition: width 0.8s;
      }

      .image {
        display: block;
        background-color: var(--primary-color);
        background-position: center;
        background-size: cover;
        background-repeat: no-repeat;
        transition-property: background-image, background-color, background-size,
          width;
        transition-duration: 0.8s;
        position: absolute;
        right: 0;
        height: 100%;
      }

      .player {
        position: relative;
        padding: 16px;
        color: var(--text-primary-color);
        transition-property: color, padding;
        transition-duration: 0.4s;
      }

      .icon {
        width: 18px;
      }

      .controls {
        padding: 8px 8px 8px 0;
        display: flex;
        justify-content: flex-start;
        align-items: center;
        transition: padding, color;
        transition-duration: 0.4s;
      }

      .controls > div {
        display: flex;
        align-items: center;
      }

      .controls paper-icon-button {
        width: 44px;
        height: 44px;
      }

      .playPauseButton {
        width: 56px !important;
        height: 56px !important;
      }

      .top-info {
        display: flex;
        justify-content: space-between;
      }

      .icon-name {
        display: flex;
        height: fit-content;
        align-items: center;
      }

      .icon-name ha-icon {
        padding-right: 8px;
      }

      .more-info {
        position: absolute;
        top: 8px;
        right: 0px;
      }

      .media-info {
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
      }

      .title-controls {
        padding-top: 16px;
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
        --paper-progress-container-color: rgba(200, 200, 200, 0.5);
      }

      .no-image .image {
        background-color: var(--primary-color);
        background-size: initial;
        background-repeat: no-repeat;
        background-position: center center;
        padding-bottom: 0;
      }

      .no-image .controls {
        padding: 0;
      }

      .off .title-controls {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        width: 100%;
      }

      .off.background {
        filter: grayscale(1);
      }

      .off .media-info {
        padding-bottom: 4px;
        display: none;
      }

      .off .controls paper-icon-button {
        margin-left: -16px;
        width: 55px;
        height: 55px;
      }

      .narrow .controls,
      .no-progress .controls {
        padding-bottom: 0;
      }

      .narrow paper-icon-button {
        width: 40px;
        height: 40px;
      }

      .narrow .playPauseButton {
        width: 50px !important;
        height: 50px !important;
      }

      .very-narrow.player {
        padding-bottom: 16px;
      }

      .no-progress.player {
        padding-bottom: 0px;
      }

      .off.player,
      .narrow.player:not(.very-narrow) {
        padding-bottom: 8px !important;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-control-card": HuiMediaControlCard;
  }
}
