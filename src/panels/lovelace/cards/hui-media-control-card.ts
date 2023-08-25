import "@material/mwc-linear-progress/mwc-linear-progress";
import type { LinearProgress } from "@material/mwc-linear-progress/mwc-linear-progress";
import { mdiDotsVertical, mdiPlayBoxMultiple } from "@mdi/js";
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
import { styleMap } from "lit/directives/style-map";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { supportsFeature } from "../../../common/entity/supports-feature";
import { extractColors } from "../../../common/image/extract_color";
import { stateActive } from "../../../common/entity/state_active";
import { debounce } from "../../../common/util/debounce";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-state-icon";
import { showMediaBrowserDialog } from "../../../components/media-player/show-media-browser-dialog";
import { isUnavailableState } from "../../../data/entity";
import {
  cleanupMediaTitle,
  computeMediaControls,
  computeMediaDescription,
  getCurrentProgress,
  handleMediaControlClick,
  MediaPickedEvent,
  MediaPlayerEntity,
  MediaPlayerEntityFeature,
  mediaPlayerPlayMedia,
} from "../../../data/media-player";
import type { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { loadPolyfillIfNeeded } from "../../../resources/resize-observer.polyfill";
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

  @state() private _config?: MediaControlCardConfig;

  @state() private _foregroundColor?: string;

  @state() private _backgroundColor?: string;

  @state() private _narrow = false;

  @state() private _veryNarrow = false;

  @state() private _cardHeight = 0;

  @query("mwc-linear-progress") private _progressBar?: LinearProgress;

  @state() private _marqueeActive = false;

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
    super.disconnectedCallback();
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = undefined;
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
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

    const entityState = stateObj.state;

    const isOffState =
      !stateActive(stateObj) && !isUnavailableState(entityState);
    const isUnavailable =
      isUnavailableState(entityState) ||
      (isOffState &&
        !supportsFeature(stateObj, MediaPlayerEntityFeature.TURN_ON));
    const hasNoImage = !this._image;
    const controls = computeMediaControls(stateObj, false);
    const showControls =
      controls &&
      (!this._veryNarrow ||
        isOffState ||
        entityState === "idle" ||
        entityState === "on");

    const mediaDescription = computeMediaDescription(stateObj);
    const mediaTitleClean = cleanupMediaTitle(stateObj.attributes.media_title);

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
              <ha-state-icon class="icon" .state=${stateObj}></ha-state-icon>
              <div>
                ${this._config!.name ||
                computeStateName(this.hass!.states[this._config!.entity])}
              </div>
            </div>
            <div>
              <ha-icon-button
                .path=${mdiDotsVertical}
                .label=${this.hass.localize(
                  "ui.panel.lovelace.cards.show_more_info"
                )}
                class="more-info"
                @click=${this._handleMoreInfo}
              ></ha-icon-button>
            </div>
          </div>
          ${!isUnavailable &&
          (mediaDescription || mediaTitleClean || showControls)
            ? html`
                <div>
                  <div class="title-controls">
                    ${!mediaDescription && !mediaTitleClean
                      ? ""
                      : html`
                          <div class="media-info">
                            <hui-marquee
                              .text=${mediaTitleClean || mediaDescription}
                              .active=${this._marqueeActive}
                              @mouseover=${this._marqueeMouseOver}
                              @mouseleave=${this._marqueeMouseLeave}
                            ></hui-marquee>
                            ${!mediaTitleClean ? "" : mediaDescription}
                          </div>
                        `}
                    ${!showControls
                      ? ""
                      : html`
                          <div class="controls">
                            ${controls!.map(
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
                            ${supportsFeature(
                              stateObj,
                              MediaPlayerEntityFeature.BROWSE_MEDIA
                            )
                              ? html`
                                  <ha-icon-button
                                    class="browse-media"
                                    .label=${this.hass.localize(
                                      "ui.card.media_player.browse_media"
                                    )}
                                    .path=${mdiPlayBoxMultiple}
                                    @click=${this._handleBrowseMedia}
                                  ></ha-icon-button>
                                `
                              : ""}
                          </div>
                        `}
                  </div>
                  ${!this._showProgressBar
                    ? ""
                    : html`
                        <mwc-linear-progress
                          determinate
                          style=${styleMap({
                            "--mdc-theme-primary":
                              this._foregroundColor || "var(--accent-color)",
                            cursor: supportsFeature(
                              stateObj,
                              MediaPlayerEntityFeature.SEEK
                            )
                              ? "pointer"
                              : "initial",
                          })}
                          @click=${this._handleSeek}
                        >
                        </mwc-linear-progress>
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
    this._attachObserver();
  }

  public willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      this._measureCard();
    }

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

  protected updated(changedProps: PropertyValues) {
    if (
      !this._config ||
      !this.hass ||
      !this._stateObj ||
      (!changedProps.has("_config") && !changedProps.has("hass"))
    ) {
      return;
    }

    const stateObj = this._stateObj;

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
      await loadPolyfillIfNeeded();
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
        mediaPlayerPlayMedia(
          this.hass,
          this._config!.entity,
          pickedMedia.item.media_content_id,
          pickedMedia.item.media_content_type
        ),
    });
  }

  private _handleClick(e: MouseEvent): void {
    handleMediaControlClick(
      this.hass!,
      this._stateObj!,
      (e.currentTarget as HTMLElement).getAttribute("action")!
    );
  }

  private _updateProgressBar(): void {
    if (this._progressBar && this._stateObj?.attributes.media_duration) {
      this._progressBar.progress =
        getCurrentProgress(this._stateObj) /
        this._stateObj!.attributes.media_duration;
    }
  }

  private get _stateObj(): MediaPlayerEntity | undefined {
    return this.hass!.states[this._config!.entity] as MediaPlayerEntity;
  }

  private _handleSeek(e: MouseEvent): void {
    const stateObj = this._stateObj!;

    if (!supportsFeature(stateObj, MediaPlayerEntityFeature.SEEK)) {
      return;
    }

    const progressWidth = (this._progressBar as HTMLElement).offsetWidth;

    const percent = e.offsetX / progressWidth;
    const position = this._stateObj!.attributes.media_duration! * percent;

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
      const { foreground, background } = await extractColors(
        this.hass.hassUrl(this._image)
      );
      this._backgroundColor = background.hex;
      this._foregroundColor = foreground.hex;
    } catch (err: any) {
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

  static get styles(): CSSResultGroup {
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
        transition:
          width 0.8s,
          opacity 0.8s linear 0.8s;
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
        transition:
          width 0.8s,
          background-image 0.8s,
          background-color 0.8s,
          background-size 0.8s,
          opacity 0.8s linear 0.8s;
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
        transition:
          opacity 0.8s,
          background-color 0.8s;
      }

      .off .image,
      .off .color-gradient {
        opacity: 0;
        transition:
          opacity 0s,
          width 0.8s;
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
        margin-inline-start: -12px;
        margin-inline-end: initial;
        padding-inline-start: 0;
        padding-inline-end: 8px;
        direction: ltr;
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
      ha-icon-button[action="media_pause"],
      ha-icon-button[action="media_stop"],
      ha-icon-button[action="turn_on"],
      ha-icon-button[action="turn_off"] {
        --mdc-icon-button-size: 56px;
        --mdc-icon-size: 40px;
      }

      ha-icon-button.browse-media {
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

      .icon-name ha-state-icon {
        padding-right: 8px;
        padding-inline-start: initial;
        padding-inline-end: 8px;
        direction: var(--direction);
      }

      .more-info {
        position: absolute;
        top: 4px;
        right: 4px;
        inset-inline-start: initial;
        inset-inline-end: 4px;
        direction: var(--direction);
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

      mwc-linear-progress {
        width: 100%;
        margin-top: 4px;
        --mdc-linear-progress-buffer-color: rgba(200, 200, 200, 0.5);
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
      .narrow ha-icon-button[action="media_pause"],
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
