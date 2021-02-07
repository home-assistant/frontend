import "@material/mwc-icon-button";
import { mdiPlayBoxMultiple } from "@mdi/js";
import "@polymer/paper-progress/paper-progress";
import type { PaperProgressElement } from "@polymer/paper-progress/paper-progress";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  query,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { styleMap } from "lit-html/directives/style-map";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stateIcon } from "../../../common/entity/state_icon";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { extractColors } from "../../../common/image/extract_color";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../../../components/ha-icon-button";
import "../../../components/ha-svg-icon";
import { showMediaBrowserDialog } from "../../../components/media-player/show-media-browser-dialog";
import { UNAVAILABLE_STATES } from "../../../data/entity";
import {
  computeMediaControls,
  computeMediaDescription,
  getCurrentProgress,
  MediaPickedEvent,
  MediaPlayerEntity,
  SUPPORT_BROWSE_MEDIA,
  SUPPORT_SEEK,
  SUPPORT_TURN_ON,
} from "../../../data/media-player";
import type { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { installResizeObserver } from "../common/install-resize-observer";
import "../components/hui-marquee";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import { MediaControlCardConfig } from "./types";

@customElement("hui-media-control-card")
export class HuiMediaControlCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-media-control-card-editor");
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

  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _config?: MediaControlCardConfig;

  @internalProperty() private _foregroundColor?: string;

  @internalProperty() private _backgroundColor?: string;

  @internalProperty() private _narrow = false;

  @internalProperty() private _veryNarrow = false;

  @internalProperty() private _cardHeight = 0;

  @query("paper-progress") private _progressBar?: PaperProgressElement;

  @internalProperty() private _marqueeActive = false;

  private _progressInterval?: number;

  private _resizeObserver?: ResizeObserver;

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: MediaControlCardConfig): void {
    if (!config.entity || config.entity.split(".")[0] !== "media_player") {
      throw new Error("Specify an entity from within the media_player domain");
    }

    this._config = config;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.updateComplete.then(() => this._attachObserver());

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
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }
    const stateObj = this._stateObj;

    if (!stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
      `;
    }

    const imageStyle = {
      "background-image": this._image
        ? `url(${this.hass.hassUrl(this._image)})`
        : "none",
      width: `${this._cardHeight}px`,
      "background-color": this._backgroundColor || "",
    };

    const gradientStyle = {
      "background-image": `linear-gradient(to right, ${
        this._backgroundColor
      }, ${this._backgroundColor + "00"})`,
      width: `${this._cardHeight}px`,
    };

    const state = stateObj.state;

    const isOffState = state === "off";
    const isUnavailable =
      UNAVAILABLE_STATES.includes(state) ||
      (state === "off" && !supportsFeature(stateObj, SUPPORT_TURN_ON));
    const hasNoImage = !this._image;
    const controls = computeMediaControls(stateObj);
    const showControls =
      controls &&
      (!this._veryNarrow || isOffState || state === "idle" || state === "on");

    const mediaDescription = computeMediaDescription(stateObj);

    return html`
      <ha-card>
        <div
          class="background ${classMap({
            "no-image": hasNoImage,
            off: isOffState || isUnavailable,
            unavailable: isUnavailable,
          })}"
        >
          <div
            class="color-block"
            style=${styleMap({
              "background-color": this._backgroundColor || "",
            })}
          ></div>
          <div
            class="no-img"
            style=${styleMap({
              "background-color": this._backgroundColor || "",
            })}
          ></div>
          <div class="image" style=${styleMap(imageStyle)}></div>
          ${hasNoImage
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
            "no-image": hasNoImage,
            narrow: this._narrow && !this._veryNarrow,
            off: isOffState || isUnavailable,
            "no-progress": this._veryNarrow || !this._showProgressBar,
            "no-controls": !showControls,
          })}"
          style=${styleMap({ color: this._foregroundColor || "" })}
        >
          <div class="top-info">
            <div class="icon-name">
              <ha-icon class="icon" .icon=${stateIcon(stateObj)}></ha-icon>
              <div>
                ${this._config!.name ||
                computeStateName(this.hass!.states[this._config!.entity])}
              </div>
            </div>
            <div>
              <ha-icon-button
                icon="hass:dots-vertical"
                class="more-info"
                @click=${this._handleMoreInfo}
              ></ha-icon-button>
            </div>
          </div>
          ${!isUnavailable &&
          (mediaDescription || stateObj.attributes.media_title || showControls)
            ? html`
                <div>
                  <div class="title-controls">
                    ${!mediaDescription && !stateObj.attributes.media_title
                      ? ""
                      : html`
                          <div class="media-info">
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
                    ${!showControls
                      ? ""
                      : html`
                          <div class="controls">
                            ${controls!.map(
                              (control) => html`
                                <ha-icon-button
                                  .title=${this.hass.localize(
                                    `ui.card.media_player.${control.action}`
                                  )}
                                  .icon=${control.icon}
                                  action=${control.action}
                                  @click=${this._handleClick}
                                ></ha-icon-button>
                              `
                            )}
                            ${supportsFeature(stateObj, SUPPORT_BROWSE_MEDIA)
                              ? html`
                                  <mwc-icon-button
                                    class="browse-media"
                                    .title=${this.hass.localize(
                                      "ui.card.media_player.browse_media"
                                    )}
                                    @click=${this._handleBrowseMedia}
                                    ><ha-svg-icon
                                      .path=${mdiPlayBoxMultiple}
                                    ></ha-svg-icon
                                  ></mwc-icon-button>
                                `
                              : ""}
                          </div>
                        `}
                  </div>
                  ${!this._showProgressBar
                    ? ""
                    : html`
                        <paper-progress
                          .max=${stateObj.attributes.media_duration}
                          style=${styleMap({
                            "--paper-progress-active-color":
                              this._foregroundColor || "var(--accent-color)",
                            cursor: supportsFeature(stateObj, SUPPORT_SEEK)
                              ? "pointer"
                              : "initial",
                          })}
                          @click=${this._handleSeek}
                        ></paper-progress>
                      `}
                </div>
              `
            : ""}
        </div>
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected firstUpdated(): void {
    this._measureCard();
    this._attachObserver();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (
      !this._config ||
      !this.hass ||
      (!changedProps.has("_config") && !changedProps.has("hass"))
    ) {
      return;
    }

    const stateObj = this._stateObj;

    if (!stateObj) {
      if (this._progressInterval) {
        clearInterval(this._progressInterval);
        this._progressInterval = undefined;
      }
      this._foregroundColor = undefined;
      this._backgroundColor = undefined;
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
      this._foregroundColor = undefined;
      this._backgroundColor = undefined;
      return;
    }

    if (this._image !== oldImage) {
      this._setColors();
    }
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
    this._narrow = card.offsetWidth < 350;
    this._veryNarrow = card.offsetWidth < 300;
    this._cardHeight = card.offsetHeight;
  }

  private async _attachObserver(): Promise<void> {
    if (!this._resizeObserver) {
      await installResizeObserver();
      this._resizeObserver = new ResizeObserver(
        debounce(() => this._measureCard(), 250, false)
      );
    }
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

  private _handleBrowseMedia(): void {
    showMediaBrowserDialog(this, {
      action: "play",
      entityId: this._config!.entity,
      mediaPickedCallback: (pickedMedia: MediaPickedEvent) =>
        this._playMedia(
          pickedMedia.item.media_content_id,
          pickedMedia.item.media_content_type
        ),
    });
  }

  private _playMedia(media_content_id: string, media_content_type: string) {
    this.hass!.callService("media_player", "play_media", {
      entity_id: this._config!.entity,
      media_content_id,
      media_content_type,
    });
  }

  private _handleClick(e: MouseEvent): void {
    const action = (e.currentTarget! as HTMLElement).getAttribute("action")!;
    this.hass!.callService("media_player", action, {
      entity_id: this._config!.entity,
    });
  }

  private _updateProgressBar(): void {
    if (this._progressBar) {
      this._progressBar.value = getCurrentProgress(this._stateObj!);
    }
  }

  private get _stateObj(): MediaPlayerEntity | undefined {
    return this.hass!.states[this._config!.entity] as MediaPlayerEntity;
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

  private async _setColors(): Promise<void> {
    if (!this._image) {
      return;
    }

    try {
      const { foreground, background } = await extractColors(this._image);
      this._backgroundColor = background.hex;
      this._foregroundColor = foreground.hex;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error getting Image Colors", err);
      this._foregroundColor = undefined;
      this._backgroundColor = undefined;
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

  static get styles(): CSSResult {
    return css`
      ha-card {
        overflow: hidden;
        height: 100%;
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
        opacity: 1;
        transition: width 0.8s, opacity 0.8s linear 0.8s;
      }

      .image {
        background-color: var(--primary-color);
        background-position: center;
        background-size: cover;
        background-repeat: no-repeat;
        position: absolute;
        right: 0;
        height: 100%;
        opacity: 1;
        transition: width 0.8s, background-image 0.8s, background-color 0.8s,
          background-size 0.8s, opacity 0.8s linear 0.8s;
      }

      .no-image .image {
        opacity: 0;
      }

      .no-img {
        background-color: var(--primary-color);
        background-size: initial;
        background-repeat: no-repeat;
        background-position: center center;
        padding-bottom: 0;
        position: absolute;
        right: 0;
        height: 100%;
        background-image: url("/static/images/card_media_player_bg.png");
        width: 50%;
        transition: opacity 0.8s, background-color 0.8s;
      }

      .off .image,
      .off .color-gradient {
        opacity: 0;
        transition: opacity 0s, width 0.8s;
        width: 0;
      }

      .unavailable .no-img,
      .background:not(.off):not(.no-image) .no-img {
        opacity: 0;
      }

      .player {
        position: relative;
        padding: 16px;
        height: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        color: var(--text-primary-color);
        transition-property: color, padding;
        transition-duration: 0.4s;
      }

      .controls {
        padding: 8px 8px 8px 0;
        display: flex;
        justify-content: flex-start;
        align-items: center;
        transition: padding, color;
        transition-duration: 0.4s;
        margin-left: -12px;
      }

      .controls > div {
        display: flex;
        align-items: center;
      }

      .controls ha-icon-button {
        --mdc-icon-button-size: 44px;
        --mdc-icon-size: 30px;
      }

      ha-icon-button[action="media_play"],
      ha-icon-button[action="media_play_pause"],
      ha-icon-button[action="media_stop"],
      ha-icon-button[action="turn_on"],
      ha-icon-button[action="turn_off"] {
        --mdc-icon-button-size: 56px;
        --mdc-icon-size: 40px;
      }

      mwc-icon-button.browse-media {
        position: absolute;
        right: 4px;
        --mdc-icon-size: 24px;
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
        top: 4px;
        right: 4px;
      }

      .media-info {
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
      }

      hui-marquee {
        font-size: 1.2em;
        margin: 0px 0 4px;
      }

      .title-controls {
        padding-top: 16px;
      }

      paper-progress {
        width: 100%;
        height: var(--paper-progress-height, 4px);
        margin-top: 4px;
        border-radius: calc(var(--paper-progress-height, 4px) / 2);
        --paper-progress-container-color: rgba(200, 200, 200, 0.5);
      }

      .no-image .controls {
        padding: 0;
      }

      .off.background {
        filter: grayscale(1);
      }

      .narrow .controls,
      .no-progress .controls {
        padding-bottom: 0;
      }

      .narrow ha-icon-button {
        --mdc-icon-button-size: 40px;
        --mdc-icon-size: 28px;
      }

      .narrow ha-icon-button[action="media_play"],
      .narrow ha-icon-button[action="media_play_pause"],
      .narrow ha-icon-button[action="turn_on"] {
        --mdc-icon-button-size: 50px;
        --mdc-icon-size: 36px;
      }

      .narrow ha-icon-button.browse-media {
        --mdc-icon-size: 24px;
      }

      .no-progress.player:not(.no-controls) {
        padding-bottom: 0px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-control-card": HuiMediaControlCard;
  }
}
