import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state, query } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { STATES_OFF } from "../../../common/const";
import parseAspectRatio from "../../../common/util/parse-aspect-ratio";
import "../../../components/ha-camera-stream";
import { CameraEntity, fetchThumbnailUrlWithCache } from "../../../data/camera";
import { UNAVAILABLE } from "../../../data/entity";
import { HomeAssistant } from "../../../types";

const UPDATE_INTERVAL = 10000;
const DEFAULT_FILTER = "grayscale(100%)";

const MAX_IMAGE_WIDTH = 640;
const ASPECT_RATIO_DEFAULT = 9 / 16;
const SCALING_FACTOR = 2;

enum LoadState {
  Loading = 1,
  NotLoading = 2,
  Error = 3,
}

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

  @state() private _imageVisible? = false;

  @state() private _loadState?: LoadState;

  @state() private _cameraImageSrc?: string;

  private _intersectionObserver?: IntersectionObserver;

  @query("img") private _image!: HTMLImageElement;

  private _lastImageHeight?: number;

  private _cameraUpdater?: number;

  public connectedCallback(): void {
    super.connectedCallback();
    if (this._loadState === undefined) {
      this._loadState = LoadState.Loading;
    }
    if (this.cameraImage && this.cameraView !== "live") {
      this._startIntersectionObserverOrUpdates();
    }
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopUpdateCameraInterval();
    this._stopIntersectionObserver();
    this._imageVisible = undefined;
  }

  protected handleIntersectionCallback(entries: IntersectionObserverEntry[]) {
    this._imageVisible = entries[0].isIntersecting;
  }

  public willUpdate(changedProps: PropertyValues): void {
    if (!changedProps.has("_imageVisible")) {
      return;
    }
    if (this._imageVisible) {
      if (this._shouldStartCameraUpdates()) {
        this._startUpdateCameraInterval();
      }
    } else {
      this._stopUpdateCameraInterval();
    }
  }

  protected render(): TemplateResult {
    if (!this.hass) {
      return html``;
    }
    const ratio = this.aspectRatio ? parseAspectRatio(this.aspectRatio) : null;
    const stateObj = this.entity ? this.hass.states[this.entity] : undefined;
    const entityState = stateObj ? stateObj.state : UNAVAILABLE;

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
      const stateImage = this.stateImage[entityState];

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

    if (this.stateFilter && this.stateFilter[entityState]) {
      filter += this.stateFilter[entityState];
    }

    if (!filter && this.entity) {
      const isOff = !stateObj || STATES_OFF.includes(entityState);
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
          : imageSrc === undefined
          ? html``
          : html`
              <img
                id="image"
                src=${imageSrc}
                @error=${this._onImageError}
                @load=${this._onImageLoad}
                style=${styleMap({
                  filter,
                  display:
                    this._loadState === LoadState.NotLoading ? "block" : "none",
                })}
              />
            `}
        ${this._loadState === LoadState.Error
          ? html`<div
              id="brokenImage"
              style=${styleMap({
                height: `${this._lastImageHeight || "100"}px`,
              })}
            ></div>`
          : imageSrc === undefined || this._loadState === LoadState.Loading
          ? html`<ha-circular-progress
              class="render-spinner"
              active
              size="small"
            ></ha-circular-progress>`
          : ""}
      </div>
    `;
  }

  protected _shouldStartCameraUpdates(oldHass?: HomeAssistant): boolean {
    return !!(
      (!oldHass || oldHass.connected !== this.hass!.connected) &&
      this.hass!.connected &&
      this.cameraView !== "live"
    );
  }

  protected _shouldStopCameraUpdates(oldHass?: HomeAssistant): boolean {
    return !!(
      (!oldHass || oldHass.connected !== this.hass!.connected) &&
      !this.hass!.connected
    );
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

      if (this._shouldStartCameraUpdates(oldHass)) {
        this._startIntersectionObserverOrUpdates();
      } else if (this._shouldStopCameraUpdates(oldHass)) {
        this._stopUpdateCameraInterval();
        // We used to set load error when stopping
        // but that resulted in every image being broken
        // when a phone is locked and unlocked
      }
    } else if (changedProps.has("cameraImage") && this.cameraView !== "live") {
      this._startIntersectionObserverOrUpdates();
    }
  }

  private _startIntersectionObserverOrUpdates(): void {
    if ("IntersectionObserver" in window) {
      if (!this._intersectionObserver) {
        this._intersectionObserver = new IntersectionObserver(
          this.handleIntersectionCallback.bind(this)
        );
      }
      this._intersectionObserver.observe(this);
    } else {
      // No support for IntersectionObserver
      // assume all images are visible
      this._imageVisible = true;
      this._startUpdateCameraInterval();
    }
  }

  private _stopIntersectionObserver(): void {
    if (this._intersectionObserver) {
      this._intersectionObserver.disconnect();
    }
  }

  private _startUpdateCameraInterval(): void {
    this._stopUpdateCameraInterval();
    this._updateCameraImageSrc();
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
    this._loadState = LoadState.Error;
  }

  private async _onImageLoad(): Promise<void> {
    this._loadState = LoadState.NotLoading;
    this._lastImageHeight = this._image.offsetHeight;
    await this.updateComplete;
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

<<<<<<< HEAD
    // One the first render we will not know the width
    const element_width =
      this._image && this._image.offsetWidth
        ? this._image.offsetWidth
        : MAX_IMAGE_WIDTH;
    // Because the aspect ratio might result in a smaller image,
    // we ask for 200% of what we need to make sure the image is
    // still clear. In practice, for 4k sources, this is still
    // an order of magnitude smaller.
    const width = Math.ceil(element_width * SCALING_FACTOR);
    // If the image has not rendered yet we may have a zero height
    const height =
      this._image && this._image.offsetHeight
        ? this._image.offsetHeight * SCALING_FACTOR
        : Math.ceil(element_width * SCALING_FACTOR * ASPECT_RATIO_DEFAULT);

    this._cameraImageSrc = await fetchThumbnailUrlWithCache(
      this.hass,
      this.cameraImage,
      width,
      height
    );
    if (this._cameraImageSrc === undefined) {
      this._onImageError();
    }
  }

  static get styles(): CSSResultGroup {
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
