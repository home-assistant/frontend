import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { STATES_OFF } from "../../../common/const";
import type {
  HASSDomCurrentTargetEvent,
  HASSDomTargetEvent,
} from "../../../common/dom/fire_event";
import { computeDomain } from "../../../common/entity/compute_domain";
import parseAspectRatio from "../../../common/util/parse-aspect-ratio";
import "../../../components/ha-camera-stream";
import type { HaCameraStream } from "../../../components/ha-camera-stream";
import "../../../components/ha-spinner";
import type { CameraEntity } from "../../../data/camera";
import { fetchThumbnailUrlWithCache } from "../../../data/camera";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { ImageEntity } from "../../../data/image";
import { computeImageUrl } from "../../../data/image";
import {
  isMediaSourceContentId,
  resolveMediaSource,
} from "../../../data/media_source";
import type { HomeAssistant } from "../../../types";

const UPDATE_INTERVAL = 10000;
const DEFAULT_FILTER = "grayscale(100%)";

const MAX_IMAGE_WIDTH = 640;
const ASPECT_RATIO_DEFAULT = 9 / 16;

const enum LoadState {
  Loading = 1,
  Loaded = 2,
  Error = 3,
}

export type StateSpecificConfig = Record<string, string>;

@customElement("hui-image")
export class HuiImage extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public entity?: string;

  @property() public image?: string;

  @property({ attribute: false }) public stateImage?: StateSpecificConfig;

  @property({ attribute: false }) public cameraImage?: string;

  @property({ attribute: false }) public cameraView?: "live" | "auto";

  @property({ attribute: false }) public aspectRatio?: string;

  @property() public filter?: string;

  @property({ attribute: false }) public stateFilter?: StateSpecificConfig;

  @property({ attribute: false }) public darkModeImage?: string;

  @property({ attribute: false }) public darkModeFilter?: string;

  @property({ attribute: "fit-mode", type: String }) public fitMode?:
    "cover" | "contain" | "fill";

  @state() private _imageVisible? = false;

  @state() private _loadState?: LoadState;

  @state() private _cameraImageSrc?: string;

  @state() private _loadedImageSrc?: string;

  @state() private _resolvedImageSrc?: string;

  @state() private _resolvedDarkModeImageSrc?: string;

  @state() private _resolvedStateImages: Record<string, string> = {};

  @state() private _lastImageHeight?: number;

  private _intersectionObserver?: IntersectionObserver;

  private _cameraUpdater?: number;

  private _cameraImageEtag?: string;

  private _cameraImageObjectUrl?: string;

  // Previous object URL still used by <img> or the aspect-ratio CSS
  // background. Revoked after the replacement image has loaded and rendered.
  private _pendingRevokeObjectUrl?: string;

  private _cameraImageRequestId = 0;

  private _ratio: {
    w: number;
    h: number;
  } | null = null;

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
    this._clearCameraImage();
  }

  protected handleIntersectionCallback(entries: IntersectionObserverEntry[]) {
    this._imageVisible = entries[0].isIntersecting;
  }

  public willUpdate(changedProps: PropertyValues): void {
    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

      if (this._shouldStartCameraUpdates(oldHass)) {
        this._startIntersectionObserverOrUpdates();
      } else if (!this.hass!.connected) {
        this._stopUpdateCameraInterval();
        this._stopIntersectionObserver();
        this._loadState = LoadState.Loading;
        this._clearCameraImage();
      }
    }
    if (changedProps.has("_imageVisible")) {
      if (this._imageVisible) {
        if (this._shouldStartCameraUpdates()) {
          this._startUpdateCameraInterval();
        }
      } else {
        this._stopUpdateCameraInterval();
      }
    }
    if (changedProps.has("aspectRatio")) {
      this._ratio = this.aspectRatio
        ? parseAspectRatio(this.aspectRatio)
        : null;
    }
    if (this._loadState === LoadState.Loading && !this.cameraImage) {
      this._loadState = LoadState.Loaded;
    }

    const firstHass = changedProps.has("hass") && !changedProps.get("hass");
    if (this.hass && (changedProps.has("image") || firstHass)) {
      if (this.image && isMediaSourceContentId(this.image)) {
        resolveMediaSource(this.hass, this.image).then((result) => {
          this._resolvedImageSrc = result.url;
        });
      } else {
        this._resolvedImageSrc = this.image;
      }
    }
    if (this.hass && (changedProps.has("darkModeImage") || firstHass)) {
      if (this.darkModeImage && isMediaSourceContentId(this.darkModeImage)) {
        resolveMediaSource(this.hass, this.darkModeImage).then((result) => {
          this._resolvedDarkModeImageSrc = result.url;
        });
      } else {
        this._resolvedDarkModeImageSrc = this.darkModeImage;
      }
    }
    if (changedProps.has("stateImage") || firstHass) {
      this._resolvedStateImages = {};
      Object.entries(this.stateImage || {}).forEach((entry) => {
        const key = entry[0] as string;
        const value = entry[1] as any;
        const image =
          (typeof value === "object" && value.media_content_id) ||
          (value as string | undefined);
        if (isMediaSourceContentId(image)) {
          resolveMediaSource(this.hass!, image).then((result) => {
            this._resolvedStateImages = {
              ...this._resolvedStateImages,
              [key]: result.url,
            };
          });
        } else {
          this._resolvedStateImages![key] = image;
        }
      });
    }
  }

  protected render() {
    if (!this.hass) {
      return nothing;
    }
    const useRatio = Boolean(
      this._ratio && this._ratio.w > 0 && this._ratio.h > 0
    );
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
      const stateImage = this._resolvedStateImages[entityState];

      if (stateImage) {
        imageSrc = stateImage;
      } else {
        imageSrc = this._resolvedImageSrc;
        imageFallback = true;
      }
    } else if (this.darkModeImage && this.hass.themes.darkMode) {
      imageSrc = this._resolvedDarkModeImageSrc;
    } else if (stateObj && computeDomain(stateObj.entity_id) === "image") {
      imageSrc = computeImageUrl(stateObj as ImageEntity);
    } else {
      imageSrc = this._resolvedImageSrc;
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
          paddingBottom: useRatio
            ? `${((100 * this._ratio!.h) / this._ratio!.w).toFixed(2)}%`
            : this._lastImageHeight === undefined
              ? "56.25%"
              : undefined,
          backgroundImage:
            useRatio && this._loadedImageSrc
              ? `url("${this._loadedImageSrc}")`
              : undefined,
          filter:
            this._loadState === LoadState.Loaded || this.cameraView === "live"
              ? filter
              : undefined,
        })}
        class="container ${classMap({
          ratio: useRatio || this._lastImageHeight === undefined,
          contain: this.fitMode === "contain",
          fill: this.fitMode === "fill",
        })}"
      >
        ${
          this.cameraImage && this.cameraView === "live"
            ? html`
                <ha-camera-stream
                  muted
                  .stateObj=${cameraObj}
                  .fitMode=${this.fitMode}
                  .aspectRatio=${
                    this._ratio ? this._ratio.w / this._ratio.h : undefined
                  }
                  @load=${this._onVideoLoad}
                ></ha-camera-stream>
              `
            : imageSrc === undefined
              ? nothing
              : html`
                  <img
                    id="image"
                    src=${imageSrc}
                    alt=${this.entity || ""}
                    @error=${this._onImageError}
                    @load=${this._onImageLoad}
                    style=${styleMap({
                      display:
                        useRatio || this._loadState === LoadState.Loaded
                          ? "block"
                          : "none",
                    })}
                  />
                `
        }
        ${
          this._loadState === LoadState.Error
            ? html`<div
                id="brokenImage"
                style=${styleMap({
                  height: !useRatio
                    ? this._lastImageHeight
                      ? `${this._lastImageHeight}px`
                      : "100%"
                    : undefined,
                })}
              ></div>`
            : this.cameraView !== "live" &&
                (imageSrc === undefined ||
                  this._loadState === LoadState.Loading)
              ? html`<div
                  class="progress-container"
                  style=${styleMap({
                    height: !useRatio
                      ? this._lastImageHeight
                        ? `${this._lastImageHeight}px`
                        : "100%"
                      : undefined,
                  })}
                >
                  <ha-spinner class="render-spinner" size="small"></ha-spinner>
                </div>`
              : ""
        }
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
        () => this._updateCameraImageSrcAtInterval(),
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

  private async _onImageLoad(
    ev: HASSDomTargetEvent<HTMLImageElement>
  ): Promise<void> {
    this._loadState = LoadState.Loaded;
    const imgEl = ev.target;
    if (this._ratio && this._ratio.w > 0 && this._ratio.h > 0) {
      this._loadedImageSrc = imgEl.src;
    }
    await this.updateComplete;
    this._lastImageHeight = imgEl.offsetHeight;
    // The aspect-ratio background (and the previous <img> decode) still
    // referenced the old object URL until this render. Safe to drop now.
    this._revokePendingCameraObjectUrl();
  }

  private async _onVideoLoad(
    ev: HASSDomCurrentTargetEvent<HaCameraStream>
  ): Promise<void> {
    this._loadState = LoadState.Loaded;
    const videoEl = ev.currentTarget;
    await this.updateComplete;
    this._lastImageHeight = videoEl.offsetHeight;
  }

  private async _updateCameraImageSrcAtInterval(): Promise<void> {
    // If we hit the interval and it was still loading
    // it means we timed out so we should show the error.
    if (this._loadState === LoadState.Loading) {
      this._onImageError();
    }
    return this._updateCameraImageSrc();
  }

  private async _updateCameraImageSrc(): Promise<void> {
    if (!this.hass || !this.cameraImage) {
      return;
    }

    const cameraState = this.hass.states[this.cameraImage] as
      CameraEntity | undefined;

    if (!cameraState) {
      this._onImageError();
      return;
    }

    const element_width = this.clientWidth || MAX_IMAGE_WIDTH;
    let width = Math.ceil(element_width * devicePixelRatio);
    let height: number;
    // If the image has not rendered yet we have no height
    if (!this._lastImageHeight) {
      if (this._ratio && this._ratio.w > 0 && this._ratio.h > 0) {
        height = Math.ceil(width * (this._ratio.h / this._ratio.w));
      } else {
        // If we don't have a ratio and we don't have a height
        // we ask for 200% of what we need because the aspect
        // ratio might result in a smaller image
        width *= 2;
        height = Math.ceil(width * ASPECT_RATIO_DEFAULT);
      }
    } else {
      height = Math.ceil(this._lastImageHeight * devicePixelRatio);
    }
    // Identifies this poll so a response that resolves after a newer poll
    // started, or after _clearCameraImage() ran, can be told apart from the
    // current one instead of clobbering it or reviving a cleared image.
    const requestId = ++this._cameraImageRequestId;

    let url: string;
    try {
      url = await fetchThumbnailUrlWithCache(
        this.hass,
        this.cameraImage,
        width,
        height
      );
    } catch (_err) {
      if (requestId === this._cameraImageRequestId) {
        this._onImageError();
      }
      return;
    }
    // The signed URL is regenerated on every poll, so the browser cache can
    // never revalidate it. Send If-None-Match ourselves instead.
    const headers: Record<string, string> = {};
    if (this._cameraImageEtag) {
      headers["If-None-Match"] = this._cameraImageEtag;
    }

    let response: Response;
    try {
      response = await fetch(url, { headers });
    } catch (_err) {
      if (requestId === this._cameraImageRequestId) {
        this._onImageError();
      }
      return;
    }

    if (requestId !== this._cameraImageRequestId) {
      // Superseded by a newer poll or a clear while this request was in
      // flight. Drain the body so the connection can still be reused, but
      // leave all state alone - a newer request owns it now.
      await this._drainCameraImageResponse(response);
      return;
    }

    // Unchanged since the last poll. Keeping the current object URL avoids
    // restarting animated images (GIF/WebP) part-way through playback. The
    // empty body still has to be consumed, or the request is torn down as
    // aborted and the connection cannot be reused.
    if (response.status === 304) {
      await this._drainCameraImageResponse(response);
      // A 304 confirms the image already shown is still current, so a
      // stale error from an earlier failed poll no longer applies.
      this._loadState = LoadState.Loaded;
      return;
    }

    if (!response.ok) {
      await this._drainCameraImageResponse(response);
      this._onImageError();
      return;
    }

    let blob: Blob;
    try {
      blob = await response.blob();
    } catch (_err) {
      this._onImageError();
      return;
    }

    if (requestId !== this._cameraImageRequestId) {
      return;
    }

    // Only commit the ETag once the body has actually been read.
    // Otherwise a failed read here would leave the old image displayed
    // while future polls send the new ETag and the server keeps
    // confirming it with 304, so this image version would never actually
    // be shown.
    this._cameraImageEtag = response.headers.get("etag") ?? undefined;

    const previousObjectUrl = this._cameraImageObjectUrl;
    this._cameraImageObjectUrl = URL.createObjectURL(blob);
    this._cameraImageSrc = this._cameraImageObjectUrl;
    if (previousObjectUrl) {
      if (this._pendingRevokeObjectUrl) {
        // Still holding the last displayed image for the aspect-ratio
        // background. The blob we are replacing never became visible.
        URL.revokeObjectURL(previousObjectUrl);
      } else {
        this._pendingRevokeObjectUrl = previousObjectUrl;
      }
    }
  }

  private async _drainCameraImageResponse(response: Response): Promise<void> {
    // An unconsumed body is torn down as aborted and the connection
    // cannot be reused, including empty 304 and error responses.
    try {
      await response.arrayBuffer();
    } catch (_err) {
      // Already consumed or the connection was dropped.
    }
  }

  private _revokePendingCameraObjectUrl(): void {
    if (this._pendingRevokeObjectUrl) {
      URL.revokeObjectURL(this._pendingRevokeObjectUrl);
      this._pendingRevokeObjectUrl = undefined;
    }
  }

  private _clearCameraImage(): void {
    // Invalidate any in-flight request so it can't recreate state (or an
    // object URL that never gets revoked) after we've just cleared it.
    this._cameraImageRequestId++;
    this._revokePendingCameraObjectUrl();
    if (this._cameraImageObjectUrl) {
      URL.revokeObjectURL(this._cameraImageObjectUrl);
      this._cameraImageObjectUrl = undefined;
    }
    this._cameraImageEtag = undefined;
    this._cameraImageSrc = undefined;
    // May still point at a blob URL we just revoked (aspect-ratio cards
    // render the last loaded src as the container background).
    this._loadedImageSrc = undefined;
  }

  static styles = css`
    :host {
      display: block;
    }

    .container {
      transition: filter 0.2s linear;
      height: 100%;
    }

    img {
      display: block;
      height: 100%;
      width: 100%;
      object-fit: cover;
    }

    ha-camera-stream {
      display: block;
      height: 100%;
      width: 100%;
    }

    .progress-container {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .ratio {
      position: relative;
      width: 100%;
      height: 0;
      background-position: center;
      background-size: cover;
    }
    .ratio.fill {
      background-size: 100% 100%;
    }
    .ratio.contain {
      background-size: contain;
      background-repeat: no-repeat;
    }
    .fill img {
      object-fit: fill;
    }
    .contain img {
      object-fit: contain;
    }

    .ratio img,
    .ratio div {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    .ratio img {
      visibility: hidden;
    }

    #brokenImage {
      background: grey url("/static/images/image-broken.svg") center/36px
        no-repeat;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-image": HuiImage;
  }
}
