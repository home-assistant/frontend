import {
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
  query,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { styleMap } from "lit-html/directives/style-map";
import { Swatch } from "node-vibrant/lib/color";
import Vibrant from "node-vibrant";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-progress/paper-progress";
// tslint:disable-next-line: no-duplicate-imports
import { PaperProgressElement } from "@polymer/paper-progress/paper-progress";
// tslint:disable-next-line: no-duplicate-imports
import { PaperIconButtonElement } from "@polymer/paper-icon-button/paper-icon-button";

import { MediaControlCardConfig } from "./types";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { HomeAssistant, MediaEntity } from "../../../types";
import { debounce } from "../../../common/util/debounce";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import { fireEvent } from "../../../common/dom/fire_event";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { stateIcon } from "../../../common/entity/state_icon";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { contrast } from "../common/color/contrast";
import { findEntities } from "../common/find-entites";
import { UNAVAILABLE_STATES } from "../../../data/entity";
import {
  SUPPORT_PAUSE,
  SUPPORT_TURN_ON,
  SUPPORT_PREVIOUS_TRACK,
  SUPPORT_NEXT_TRACK,
  SUPPORTS_PLAY,
  SUPPORT_STOP,
  SUPPORT_SEEK,
  CONTRAST_RATIO,
  getCurrentProgress,
  computeMediaDescription,
  SUPPORT_TURN_OFF,
  SUPPORT_VOLUME_SET,
  SUPPORT_VOLUME_BUTTONS,
  SUPPORT_VOLUME_MUTE,
} from "../../../data/media-player";

import "../../../components/ha-slider";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../components/hui-marquee";

function getContrastRatio(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  return Math.round((contrast(rgb1, rgb2) + Number.EPSILON) * 100) / 100;
}

// How much the total diff between 2 RGB colors can be
// to be considered similar.
const COLOR_SIMILARITY_THRESHOLD = 150;

// For debug purposes, is being tree shaken.
const DEBUG_COLOR = __DEV__ && false;

const logColor = (
  color: Swatch,
  label: string = `${color.getHex()} - ${color.getPopulation()}`
) =>
  // tslint:disable-next-line:no-console
  console.log(
    `%c${label}`,
    `color: ${color.getBodyTextColor()}; background-color: ${color.getHex()}`
  );

const customGenerator = (colors: Swatch[]) => {
  colors.sort((colorA, colorB) => colorB.population - colorA.population);

  const backgroundColor = colors[0];
  let foregroundColor: string | undefined;

  const contrastRatios = new Map<Swatch, number>();
  const approvedContrastRatio = (color: Swatch) => {
    if (!contrastRatios.has(color)) {
      contrastRatios.set(
        color,
        getContrastRatio(backgroundColor.rgb, color.rgb)
      );
    }

    return contrastRatios.get(color)! > CONTRAST_RATIO;
  };

  // We take each next color and find one that has better contrast.
  for (let i = 1; i < colors.length && foregroundColor === undefined; i++) {
    // If this color matches, score, take it.
    if (approvedContrastRatio(colors[i])) {
      if (DEBUG_COLOR) {
        logColor(colors[i], "PICKED");
      }
      foregroundColor = colors[i].hex;
      break;
    }

    // This color has the wrong contrast ratio, but it is the right color.
    // Let's find similar colors that might have the right contrast ratio

    const currentColor = colors[i];
    if (DEBUG_COLOR) {
      logColor(colors[i], "Finding similar color with better contrast");
    }

    for (let j = i + 1; j < colors.length; j++) {
      const compareColor = colors[j];

      // difference. 0 is same, 765 max difference
      const diffScore =
        Math.abs(currentColor.rgb[0] - compareColor.rgb[0]) +
        Math.abs(currentColor.rgb[1] - compareColor.rgb[1]) +
        Math.abs(currentColor.rgb[2] - compareColor.rgb[2]);

      if (DEBUG_COLOR) {
        logColor(colors[j], `${colors[j].hex} - ${diffScore}`);
      }

      if (diffScore > COLOR_SIMILARITY_THRESHOLD) {
        continue;
      }

      if (approvedContrastRatio(compareColor)) {
        if (DEBUG_COLOR) {
          logColor(compareColor, "PICKED");
        }
        foregroundColor = compareColor.hex;
        break;
      }
    }
  }

  if (foregroundColor === undefined) {
    foregroundColor = backgroundColor.bodyTextColor;
  }

  if (DEBUG_COLOR) {
    // tslint:disable-next-line:no-console
    console.log();
    // tslint:disable-next-line:no-console
    console.log(
      "%cPicked colors",
      `color: ${foregroundColor}; background-color: ${backgroundColor.hex}; font-weight: bold; padding: 16px;`
    );
    colors.forEach((color) => logColor(color));
    // tslint:disable-next-line:no-console
    console.log();
  }

  return [foregroundColor, backgroundColor.rgb.join(",")];
};

interface ControlButton {
  icon: string;
  action: string;
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
    entities: string[],
    entitiesFallback: string[]
  ): MediaControlCardConfig {
    const includeDomains = ["media_player"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );

    return { type: "media-control", entity: foundEntities[0] || "" };
  }

  @property() public hass?: HomeAssistant;
  @property() private _config?: MediaControlCardConfig;
  @property() private _foregroundHexColor?: string;
  @property() private _backgroundRGBValues?: string;
  @property() private _narrow: boolean = false;
  @property() private _veryNarrow: boolean = false;
  @property() private _cardHeight: number = 0;
  @query("paper-progress") private _progressBar?: PaperProgressElement;
  @property() private _marqueeActive: boolean = false;
  private _progressInterval?: number;
  private _resizeObserver?: ResizeObserver;

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: MediaControlCardConfig): void {
    if (!config.entity || config.entity.split(".")[0] !== "media_player") {
      throw new Error("Specify an entity from within the media_player domain.");
    }

    this._config = config;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.updateComplete.then(() => this._measureCard());

    if (!this.hass || !this._config) {
      return;
    }

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
    if (!this.hass || !this._config) {
      return html``;
    }
    const stateObj = this._stateObj;

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

    const imageWidth =
      this._cardHeight > this.offsetWidth / 2
        ? this.offsetWidth / 2
        : this._cardHeight;

    const cardStyles = {
      "--background-image": this._image
        ? `url(${this.hass.hassUrl(this._image)})`
        : "none",
      "--background-color-values": this._backgroundRGBValues || "",
      "--background-color": this._backgroundRGBValues
        ? `rgb(${this._backgroundRGBValues})`
        : "",
      "--foreground-color": this._foregroundHexColor
        ? `${this._foregroundHexColor}`
        : "",
      "--image-width": `${imageWidth}px`,
    };

    const state = stateObj.state;

    const isOffState = state === "off";
    const isUnavailable =
      UNAVAILABLE_STATES.includes(state) ||
      (state === "off" && !supportsFeature(stateObj, SUPPORT_TURN_ON));

    const controls = this._getControls();

    const mediaDescription = computeMediaDescription(stateObj);
    const hasNoImage = !this._image;

    return html`
      <ha-card>
        <div style=${styleMap(cardStyles)}>
          <div
            class="background ${classMap({
              "no-image": hasNoImage,
              off: isOffState || isUnavailable,
              unavailable: isUnavailable,
            })}"
          >
            <div class="color-block"></div>
            <div class="no-img"></div>
            <div class="image"></div>
            ${hasNoImage
              ? ""
              : html`
                  <div class="color-gradient"></div>
                `}
          </div>
          <div
            class="player ${classMap({
              "no-image": hasNoImage,
              narrow: this._narrow,
              off: isOffState || isUnavailable,
              "no-progress": this._veryNarrow || !this._showProgressBar,
              "no-controls": !controls,
            })}"
          >
            <div class="top">
              <div class="icon-name">
                <ha-icon .icon=${stateIcon(stateObj)}></ha-icon>
                <div>
                  ${this._config!.name ||
                    computeStateName(this.hass!.states[this._config!.entity])}
                </div>
              </div>
              <paper-icon-button
                icon="hass:dots-vertical"
                @click=${this._handleMoreInfo}
              ></paper-icon-button>
            </div>
            ${isUnavailable
              ? ""
              : html`
                  ${!mediaDescription && !stateObj.attributes.media_title
                    ? ""
                    : html`
                        <div
                          class="media-info"
                          style=${styleMap({
                            paddingRight: isOffState
                              ? "0"
                              : "calc(var(--image-width) - 40px)",
                          })}
                        >
                          <hui-marquee
                            .text=${stateObj.attributes.media_title ||
                              mediaDescription}
                            .active=${this._marqueeActive}
                            @mouseover=${this._marqueeMouseOver}
                            @mouseleave=${this._marqueeMouseLeave}
                          ></hui-marquee>
                          ${!stateObj.attributes.media_title
                            ? ""
                            : mediaDescription}
                        </div>
                      `}
                  <div class="controls">
                    ${!controls
                      ? ""
                      : html`
                          <div class="playback-controls">
                            ${controls!.map(
                              (control) => html`
                                <paper-icon-button
                                  action=${control.action}
                                  .icon=${control.icon}
                                  @click=${this._handleClick}
                                ></paper-icon-button>
                              `
                            )}
                          </div>
                        `}
                    ${this._veryNarrow ||
                    isOffState ||
                    state === "idle" ||
                    (!supportsFeature(stateObj, SUPPORT_VOLUME_SET) &&
                      !supportsFeature(stateObj, SUPPORT_VOLUME_BUTTONS))
                      ? ""
                      : html`
                          <div class="volume-control">
                            ${supportsFeature(stateObj, SUPPORT_VOLUME_MUTE)
                              ? html`
                                  <paper-icon-button
                                    .icon=${stateObj.attributes.is_volume_muted!
                                      ? "hass:volume-off"
                                      : "hass:volume-high"}
                                    @click=${this._toggleMute}
                                  ></paper-icon-button>
                                `
                              : ""}
                            ${!this._veryNarrow &&
                            supportsFeature(stateObj, SUPPORT_VOLUME_SET)
                              ? html`
                                  <ha-slider
                                    pin
                                    ignore-bar-touch
                                    .dir=${computeRTLDirection(this.hass!)}
                                    .value=${stateObj.attributes.volume_level! *
                                      100}
                                    @change=${this._selectedValueChanged}
                                  ></ha-slider>
                                `
                              : !this._veryNarrow &&
                                supportsFeature(
                                  stateObj,
                                  SUPPORT_VOLUME_BUTTONS
                                )
                              ? html`
                                  <paper-icon-button
                                    icon="hass:volume-minus"
                                    @click=${this._volumeDown}
                                  ></paper-icon-button>
                                  <paper-icon-button
                                    icon="hass:volume-plus"
                                    @click=${this._volumeUp}
                                  ></paper-icon-button>
                                `
                              : ""}
                          </div>
                        `}
                  </div>
                  ${!this._showProgressBar
                    ? ""
                    : html`
                        <paper-progress
                          style=${styleMap({
                            cursor: supportsFeature(stateObj, SUPPORT_SEEK)
                              ? "pointer"
                              : "initial",
                          })}
                          .max=${stateObj.attributes.media_duration}
                          @click=${this._handleSeek}
                        ></paper-progress>
                      `}
                `}
          </div>
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

    const stateObj = this._stateObj;

    if (!stateObj) {
      if (this._progressInterval) {
        clearInterval(this._progressInterval);
        this._progressInterval = undefined;
      }
      this._foregroundHexColor = undefined;
      this._backgroundRGBValues = undefined;
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

    const oldImage =
      oldHass?.states[this._config.entity]?.attributes.entity_picture_local ||
      oldHass?.states[this._config.entity]?.attributes.entity_picture;

    if (!this._image) {
      this._foregroundHexColor = undefined;
      this._backgroundRGBValues = undefined;
      return;
    }

    if (this._image !== oldImage) {
      this._setColors();
    }
  }

  private _getControls(): ControlButton[] | undefined {
    const stateObj = this._stateObj;

    if (!stateObj) {
      return undefined;
    }

    const state = stateObj.state;

    if (UNAVAILABLE_STATES.includes(state)) {
      return undefined;
    }

    if (state === "off") {
      return supportsFeature(stateObj, SUPPORT_TURN_ON)
        ? [
            {
              icon: "hass:power",
              action: "turn_on",
            },
          ]
        : undefined;
    }

    if (state === "on") {
      return supportsFeature(stateObj, SUPPORT_TURN_OFF)
        ? [
            {
              icon: "hass:power",
              action: "turn_off",
            },
          ]
        : undefined;
    }

    if (state === "idle") {
      return supportsFeature(stateObj, SUPPORTS_PLAY)
        ? [
            {
              icon: "hass:play",
              action: "media_play",
            },
          ]
        : undefined;
    }

    const buttons: ControlButton[] = [];

    if (supportsFeature(stateObj, SUPPORT_PREVIOUS_TRACK)) {
      buttons.push({
        icon: "hass:skip-previous",
        action: "media_previous_track",
      });
    }

    if (
      (state === "playing" &&
        (supportsFeature(stateObj, SUPPORT_PAUSE) ||
          supportsFeature(stateObj, SUPPORT_STOP))) ||
      (state === "paused" && supportsFeature(stateObj, SUPPORTS_PLAY))
    ) {
      buttons.push({
        icon:
          state !== "playing"
            ? "hass:play"
            : supportsFeature(stateObj, SUPPORT_PAUSE)
            ? "hass:pause"
            : "hass:stop",
        action: "media_play_pause",
      });
    }

    if (supportsFeature(stateObj, SUPPORT_NEXT_TRACK)) {
      buttons.push({
        icon: "hass:skip-next",
        action: "media_next_track",
      });
    }

    return buttons.length > 0 ? buttons : undefined;
  }

  private get _image() {
    if (!this.hass || !this._config) {
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

  private get _showProgressBar() {
    if (!this.hass || !this._config || this._narrow) {
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

  private _measureCard() {
    const card = this.shadowRoot!.querySelector("ha-card");
    if (!card) {
      return;
    }
    this._narrow = card.offsetWidth < 300;
    this._veryNarrow = card.offsetWidth < 250;
    this._cardHeight = card.offsetHeight;
  }

  private _attachObserver(): void {
    if (typeof ResizeObserver !== "function") {
      import("resize-observer").then((modules) => {
        modules.install();
        this._attachObserver();
      });
      return;
    }

    this._resizeObserver = new ResizeObserver(
      debounce(() => this._measureCard(), 250, false)
    );

    const card = this.shadowRoot!.querySelector("ha-card");
    // If we show an error or warning there is no ha-card
    if (!card) {
      return;
    }
    this._resizeObserver.observe(card);
  }

  private _handleMoreInfo(): void {
    fireEvent(this, "hass-more-info", {
      entityId: this._config!.entity,
    });
  }

  private _handleClick(e: MouseEvent): void {
    this.hass!.callService(
      "media_player",
      (e.currentTarget! as PaperIconButtonElement).getAttribute("action")!,
      {
        entity_id: this._config!.entity,
      }
    );
  }

  private _updateProgressBar(): void {
    if (this._progressBar) {
      this._progressBar.value = getCurrentProgress(this._stateObj!);
    }
  }

  private get _stateObj(): MediaEntity | undefined {
    return this.hass!.states[this._config!.entity] as MediaEntity;
  }

  private _handleSeek(e: MouseEvent): void {
    const stateObj = this._stateObj!;

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

    new Vibrant(this._image, {
      colorCount: 16,
      generator: customGenerator,
    })
      .getPalette()
      .then(([foreground, background]: [string, string]) => {
        this._backgroundRGBValues = background;
        this._foregroundHexColor = foreground;
      })
      .catch((err: any) => {
        // tslint:disable-next-line:no-console
        console.error("Error getting Image Colors", err);
        this._foregroundHexColor = undefined;
        this._backgroundRGBValues = undefined;
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

  private _toggleMute() {
    this.hass!.callService("media_player", "volume_mute", {
      entity_id: this._config!.entity,
      is_volume_muted: !this.hass!.states[this._config!.entity].attributes
        .is_volume_muted,
    });
  }

  private _volumeDown() {
    this.hass!.callService("media_player", "volume_down", {
      entity_id: this._config!.entity,
    });
  }

  private _volumeUp() {
    this.hass!.callService("media_player", "volume_up", {
      entity_id: this._config!.entity,
    });
  }

  private _selectedValueChanged(ev): void {
    this.hass!.callService("media_player", "volume_set", {
      entity_id: this._config!.entity,
      volume_level: ev.target.value / 100,
    });
  }

  static get styles(): CSSResult {
    return css`
      ha-card {
        overflow: hidden;
      }

      /* ====================== Background/Image Layer ====================== */

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
        background-color: var(--background-color, var(--primary-color));
        transition: background-color 0.8s;
        width: 100%;
      }

      .color-gradient {
        position: absolute;
        background-image: linear-gradient(
          to right,
          var(--background-color),
          rgba(var(--background-color-values), 0)
        );
        height: 100%;
        right: 0;
        opacity: 1;
        transition: width 0.8s, opacity 0.8s linear 0.8s;
        width: var(--image-width);
      }

      .image {
        background-color: var(--background-color, var(--primary-color));
        background-position: center;
        background-size: cover;
        background-repeat: no-repeat;
        position: absolute;
        right: 0;
        height: 100%;
        opacity: 1;
        transition: width 0.8s, background-image 0.8s, background-color 0.8s,
          background-size 0.8s, opacity 0.8s linear 0.8s;
        width: var(--image-width);
        background-image: var(--background-image);
      }

      .no-image .image {
        opacity: 0;
      }

      .no-img {
        background-color: var(--background-color, var(--primary-color));
        background-image: url("../static/images/card_media_player_bg.png");
        background-size: initial;
        background-repeat: no-repeat;
        background-position: center center;
        position: absolute;
        right: 0;
        width: 50%;
        height: 100%;
        padding-bottom: 0;
        transition: opacity 0.8s, background-color 0.8s;
      }

      .off .image,
      .off .color-gradient {
        opacity: 0;
        transition: opacity 0s, width 0.8s;
        width: 0;
      }

      .off.background {
        filter: grayscale(1);
      }

      .unavailable .no-img,
      .background:not(.off):not(.no-image) .no-img {
        opacity: 0;
      }

      /* ====================== Player Layer ====================== */

      .player {
        position: relative;
        padding: 16px;
        color: var(--foreground-color, var(--text-primary-color));
        transition-property: color, padding;
        transition-duration: 0.4s;
      }

      .no-progress.player:not(.no-controls) {
        padding-bottom: 0px;
      }

      .top {
        display: flex;
        justify-content: space-between;
      }

      .top paper-icon-button {
        position: absolute;
        top: 8px;
        right: 0px;
      }

      .icon-name {
        display: flex;
        height: fit-content;
        align-items: center;
      }

      .icon-name ha-icon {
        width: 18px;
        padding-right: 8px;
      }

      .media-info {
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        padding-top: 12px;
      }

      hui-marquee {
        font-size: 16px;
        margin: 0px 0 4px;
        font-weight: bold;
      }

      /* ====================== Controls ====================== */

      .controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 8px;
      }

      .no-progress .controls,
      .no-image .controls {
        padding-bottom: 0;
      }

      .playback-controls {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        transition: padding, color;
        transition-duration: 0.4s;
        margin-left: -12px;
      }

      .playback-controls > div {
        display: flex;
        align-items: center;
      }

      .playback-controls paper-icon-button {
        width: 44px;
        height: 44px;
      }

      paper-icon-button[action="media_play"],
      paper-icon-button[action="media_play_pause"],
      paper-icon-button[action="turn_on"],
      paper-icon-button[action="turn_off"] {
        width: 56px;
        height: 56px;
      }

      .volume-control {
        display: flex;
        flex-grow: 2;
        justify-content: flex-end;
      }

      .volume-control paper-icon-button {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
      }

      ha-slider {
        --paper-slider-active-color: var(--foreground-color);
        --paper-slider-knob-color: var(--foreground-color);
        --paper-slider-knob-start-color: var(--foreground-color);
        --paper-progress-container-color: rgba(200, 200, 200, 0.5);
        width: 100%;
        max-width: 200px;
        margin-right: -16px;
      }

      paper-progress {
        width: 100%;
        height: 4px;
        margin-top: 4px;
        border-radius: 2px;
        --paper-progress-container-color: rgba(200, 200, 200, 0.5);
        --paper-progress-active-color: var(
          --foreground-color,
          var(--accent-color)
        );
      }

      /* ====================== Narrow ====================== */

      .narrow .controls {
        padding-bottom: 0;
      }

      .narrow paper-icon-button {
        width: 40px;
        height: 40px;
      }

      .narrow paper-icon-button[action="media_play"],
      .narrow paper-icon-button[action="media_play_pause"],
      .narrow paper-icon-button[action="turn_on"] {
        width: 50px;
        height: 50px;
      }

      .narrow hui-marquee {
        font-size: 14px;
      }

      .narrow .media-info,
      .narrow .icon-name {
        font-size: 12px;
      }

      .narrow .icon-name ha-icon {
        width: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-control-card": HuiMediaControlCard;
  }
}
