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
import { STATES_OFF } from "../../../common/const";
import parseAspectRatio from "../../../common/util/parse-aspect-ratio";
import "../../../components/ha-camera-stream";
import { CameraEntity, fetchThumbnailUrlWithCache } from "../../../data/camera";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";

const UPDATE_INTERVAL = 10000;
const DEFAULT_FILTER = "grayscale(100%)";

export interface StateSpecificConfig {
  [state: string]: string;
}

@customElement("hui-image")
export class HuiImage extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public entity?: string;

  @property() public image?: string;

  @property() public stateImage?: StateSpecificConfig;

  @property() public cameraImage?: string;

  @property() public cameraView?: "live" | "auto";

  @property() public aspectRatio?: string;

  @property() public filter?: string;

  @property() public stateFilter?: StateSpecificConfig;

  @property() public darkModeImage?: string;

  @property() public darkModeFilter?: string;

  @internalProperty() private _loadError?: boolean;

  @internalProperty() private _cameraImageSrc?: string;

  @query("img") private _image!: HTMLImageElement;

  private _lastImageHeight?: number;

  private _cameraUpdater?: number;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.cameraImage && this.cameraView !== "live") {
      this._startUpdateCameraInterval();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopUpdateCameraInterval();
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }
    const ratio = this.aspectRatio ? parseAspectRatio(this.aspectRatio) : null;
    const stateObj = this.entity ? this.hass.states[this.entity] : undefined;
    const state = stateObj ? stateObj.state : UNAVAILABLE;

    // Figure out image source to use
    let imageSrc: string | undefined;
    let cameraObj: CameraEntity | undefined;
    // Track if we are we using a fallback image, used for filter.
    let imageFallback = !this.stateImage;

    if (this.cameraImage) {
      if (this.cameraView === "live") {
        cameraObj = this.hass.states[this.cameraImage] as CameraEntity;
      } else {
        imageSrc = this._cameraImageSrc;
      }
    } else if (this.stateImage) {
      const stateImage = this.stateImage[state];

      if (stateImage) {
        imageSrc = stateImage;
      } else {
        imageSrc = this.image;
        imageFallback = true;
      }
    } else if (this.darkModeImage && this.hass.themes.darkMode) {
      imageSrc = this.darkModeImage;
    } else {
      imageSrc = this.image;
    }

    if (imageSrc) {
      imageSrc = this.hass.hassUrl(imageSrc);
    }

    // Figure out filter to use
    let filter = this.filter || "";

    if (this.hass.themes.darkMode && this.darkModeFilter) {
      filter += this.darkModeFilter;
    }

    if (this.stateFilter && this.stateFilter[state]) {
      filter += this.stateFilter[state];
    }

    if (!filter && this.entity) {
      const isOff = !stateObj || STATES_OFF.includes(state);
      filter = isOff && imageFallback ? DEFAULT_FILTER : "";
    }

    return html`
      <div
        style=${styleMap({
          paddingBottom:
            ratio && ratio.w > 0 && ratio.h > 0
              ? `${((100 * ratio.h) / ratio.w).toFixed(2)}%`
              : "",
        })}
        class=${classMap({
          ratio: Boolean(ratio && ratio.w > 0 && ratio.h > 0),
        })}
      >
        ${this.cameraImage && this.cameraView === "live"
          ? html`
              <ha-camera-stream
                muted
                .hass=${this.hass}
                .stateObj=${cameraObj}
              ></ha-camera-stream>
            `
          : html`
              <img
                id="image"
                src=${imageSrc}
                @error=${this._onImageError}
                @load=${this._onImageLoad}
                style=${styleMap({
                  filter,
                  display: this._loadError ? "none" : "block",
                })}
              />
            `}
        <div
          id="brokenImage"
          style=${styleMap({
            height: `${this._lastImageHeight || "100"}px`,
            display: this._loadError ? "block" : "none",
          })}
        ></div>
      </div>
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!oldHass || oldHass.connected !== this.hass!.connected) {
        if (this.hass!.connected && this.cameraView !== "live") {
          this._updateCameraImageSrc();
          this._startUpdateCameraInterval();
        } else if (!this.hass!.connected) {
          this._stopUpdateCameraInterval();
          this._cameraImageSrc = undefined;
          this._loadError = true;
        }
      }
    } else if (changedProps.has("cameraImage") && this.cameraView !== "live") {
      this._updateCameraImageSrc();
      this._startUpdateCameraInterval();
    }
  }

  private _startUpdateCameraInterval(): void {
    this._stopUpdateCameraInterval();
    if (this.cameraImage && this.isConnected) {
      this._cameraUpdater = window.setInterval(
        () => this._updateCameraImageSrc(),
        UPDATE_INTERVAL
      );
    }
  }

  private _stopUpdateCameraInterval(): void {
    if (this._cameraUpdater) {
      clearInterval(this._cameraUpdater);
      this._cameraUpdater = undefined;
    }
  }

  private _onImageError(): void {
    this._loadError = true;
  }

  private async _onImageLoad(): Promise<void> {
    this._loadError = false;
    await this.updateComplete;
    this._lastImageHeight = this._image.offsetHeight;
  }

  private async _updateCameraImageSrc(): Promise<void> {
    if (!this.hass || !this.cameraImage) {
      return;
    }

    const cameraState = this.hass.states[this.cameraImage] as
      | CameraEntity
      | undefined;

    if (!cameraState) {
      this._onImageError();
      return;
    }

    this._cameraImageSrc = await fetchThumbnailUrlWithCache(
      this.hass,
      this.cameraImage
    );
  }

  static get styles(): CSSResult {
    return css`
      img {
        display: block;
        height: auto;
        transition: filter 0.2s linear;
        width: 100%;
      }

      .ratio {
        position: relative;
        width: 100%;
        height: 0;
      }

      .ratio img,
      .ratio div {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
      }

      #brokenImage {
        background: grey url("/static/images/image-broken.svg") center/36px
          no-repeat;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-image": HuiImage;
  }
}
