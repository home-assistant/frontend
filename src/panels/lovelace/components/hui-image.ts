import "@polymer/paper-toggle-button/paper-toggle-button";

import { STATES_OFF } from "../../../common/const";

import parseAspectRatio from "../../../common/util/parse-aspect-ratio";
import {
  LitElement,
  TemplateResult,
  html,
  property,
  CSSResult,
  css,
  PropertyValues,
  query,
  customElement,
} from "lit-element";
import { HomeAssistant } from "../../../types";
import { styleMap } from "lit-html/directives/style-map";
import { classMap } from "lit-html/directives/class-map";
import { b64toBlob } from "../../../common/file/b64-to-blob";
import { fetchThumbnail } from "../../../data/camera";

const UPDATE_INTERVAL = 10000;
const DEFAULT_FILTER = "grayscale(100%)";

export interface StateSpecificConfig {
  [state: string]: string;
}

@customElement("hui-image")
class HuiImage extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() public entity?: string;

  @property() public image?: string;

  @property() public stateImage?: StateSpecificConfig;

  @property() public cameraImage?: string;

  @property() public aspectRatio?: string;

  @property() public filter?: string;

  @property() public stateFilter?: StateSpecificConfig;

  @property() private _loadError?: boolean;

  @property() private _cameraImageSrc?: string;

  @query("img") private _image!: HTMLImageElement;

  private _lastImageHeight?: number;

  private _cameraUpdater?: number;

  private _attached?: boolean;

  public connectedCallback(): void {
    super.connectedCallback();
    this._attached = true;
    this._startUpdateCameraInterval();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._attached = false;
    this._stopUpdateCameraInterval();
  }

  protected render(): TemplateResult | void {
    const ratio = this.aspectRatio ? parseAspectRatio(this.aspectRatio) : null;
    const stateObj =
      this.hass && this.entity ? this.hass.states[this.entity] : undefined;
    const state = stateObj ? stateObj.state : "unavailable";

    // Figure out image source to use
    let imageSrc: string | undefined;
    // Track if we are we using a fallback image, used for filter.
    let imageFallback = !this.stateImage;

    if (this.cameraImage) {
      imageSrc = this._cameraImageSrc;
    } else if (this.stateImage) {
      const stateImage = this.stateImage[state];

      if (stateImage) {
        imageSrc = stateImage;
      } else {
        imageSrc = this.image;
        imageFallback = true;
      }
    } else {
      imageSrc = this.image;
    }

    // Figure out filter to use
    let filter = this.filter || "";

    if (this.stateFilter && this.stateFilter[state]) {
      filter = this.stateFilter[state];
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
    if (changedProps.has("cameraImage")) {
      this._updateCameraImageSrc();
      this._startUpdateCameraInterval();
      return;
    }
  }

  private _startUpdateCameraInterval(): void {
    this._stopUpdateCameraInterval();
    if (this.cameraImage && this._attached) {
      this._cameraUpdater = window.setInterval(
        () => this._updateCameraImageSrc(),
        UPDATE_INTERVAL
      );
    }
  }

  private _stopUpdateCameraInterval(): void {
    if (this._cameraUpdater) {
      clearInterval(this._cameraUpdater);
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
    try {
      const { content_type: contentType, content } = await fetchThumbnail(
        this.hass,
        this.cameraImage
      );
      if (this._cameraImageSrc) {
        URL.revokeObjectURL(this._cameraImageSrc);
      }
      this._cameraImageSrc = URL.createObjectURL(
        b64toBlob(content, contentType)
      );
      this._onImageLoad();
    } catch (err) {
      this._onImageError();
    }
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
