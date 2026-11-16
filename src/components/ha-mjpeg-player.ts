import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../common/dom/fire_event";

// How often the image is checked for its first frame
const LOAD_CHECK_INTERVAL = 250;

// MJPEG streams rarely send more frames than this
const PICTURE_IN_PICTURE_FRAME_RATE = 15;

/**
 * Shows an MJPEG stream as an image, like any browser can. Picture in
 * picture only works with a video, so while it is open, the image is copied
 * into a canvas that a hidden video plays. The video only plays then, so
 * browsers don't offer picture in picture on their own.
 */
@customElement("ha-mjpeg-player")
export class HaMjpegPlayer extends LitElement {
  @property() public src?: string;

  @property() public alt?: string;

  @property({ attribute: false }) public aspectRatio?: number;

  @property({ attribute: false }) public fitMode?: "cover" | "contain" | "fill";

  @state() private _loaded = false;

  // The image can be copied, it is not from another origin
  @state() private _canCopy = false;

  @query("#stream") private _imageEl?: HTMLImageElement;

  @query("video") private _videoEl?: HTMLVideoElement;

  private _canvas?: HTMLCanvasElement;

  private _stream?: MediaStream;

  private _loadCheckInterval?: number;

  private _drawInterval?: number;

  /** The video for picture in picture, undefined when it can't be shown. */
  public get videoElement(): HTMLVideoElement | undefined {
    return this._canCopy ? this._videoEl : undefined;
  }

  /** Starts playing the video, which picture in picture needs first. */
  public async preparePictureInPicture(): Promise<void> {
    const video = this._videoEl;
    if (!this._canCopy || !video || this._stream) {
      return;
    }
    this._drawFrame();
    // Captures a frame whenever the canvas is drawn
    this._stream = this._canvas!.captureStream();
    video.srcObject = this._stream;
    this._drawInterval = window.setInterval(
      () => this._drawFrame(),
      1000 / PICTURE_IN_PICTURE_FRAME_RATE
    );
    await video.play();
  }

  public connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated && !this._loaded) {
      this._startLoadCheck();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._stopLoadCheck();
    this._stopVideo();
  }

  protected firstUpdated() {
    this._startLoadCheck();
  }

  protected render() {
    if (!this.src) {
      return nothing;
    }
    const style = styleMap({
      aspectRatio: this.aspectRatio,
      objectFit: this.fitMode,
    });
    return html`
      ${this._loaded ? nothing : html`<div class="placeholder"></div>`}
      <img
        id="stream"
        class=${this._loaded ? "" : "loading"}
        .src=${this.src}
        alt=${this.alt ?? ""}
        style=${style}
        draggable="false"
        @load=${this._checkLoaded}
        @error=${this._stopLoadCheck}
      />
      <video
        muted
        playsinline
        disableremoteplayback
        aria-hidden="true"
        @leavepictureinpicture=${this._stopVideo}
      ></video>
    `;
  }

  private _startLoadCheck() {
    this._stopLoadCheck();
    this._loadCheckInterval = window.setInterval(
      () => this._checkLoaded(),
      LOAD_CHECK_INTERVAL
    );
  }

  private _stopLoadCheck() {
    clearInterval(this._loadCheckInterval);
    this._loadCheckInterval = undefined;
  }

  // An MJPEG stream never completes loading, so only wait for a first frame
  private _checkLoaded() {
    if (!this._imageEl?.naturalWidth) {
      return;
    }
    this._canCopy = this._testCopy();
    this._setLoaded();
  }

  private _setLoaded() {
    this._stopLoadCheck();
    if (!this._loaded) {
      this._loaded = true;
      fireEvent(this, "load");
    }
  }

  /** An image from another origin can't be copied out of a canvas. */
  private _testCopy(): boolean {
    try {
      this._drawFrame();
      this._canvas?.getContext("2d")?.getImageData(0, 0, 1, 1);
      return Boolean(this._canvas);
    } catch (_err: unknown) {
      return false;
    }
  }

  private _drawFrame() {
    const image = this._imageEl;
    if (!image?.naturalWidth) {
      return;
    }
    if (!this._canvas) {
      this._canvas = document.createElement("canvas");
    }
    const canvas = this._canvas;
    if (
      canvas.width !== image.naturalWidth ||
      canvas.height !== image.naturalHeight
    ) {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
    }
    canvas.getContext("2d")?.drawImage(image, 0, 0);
  }

  private _stopVideo = () => {
    clearInterval(this._drawInterval);
    this._drawInterval = undefined;
    this._stream?.getTracks().forEach((track) => track.stop());
    this._stream = undefined;
    if (this._videoEl) {
      this._videoEl.srcObject = null;
    }
  };

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    img {
      display: block;
      width: 100%;
      max-height: var(--video-max-height, calc(100vh - 97px));
      object-fit: contain;
      user-select: none;
      -webkit-user-select: none;
    }

    /* Keeps the room of a picture until the first frame, so nothing jumps */
    .placeholder {
      aspect-ratio: 16 / 9;
      max-height: var(--video-max-height, calc(100vh - 97px));
    }

    /* Shows over the placeholder as soon as the browser draws a frame, some
       browsers don't load a stream they don't show */
    img.loading {
      position: absolute;
      inset: 0;
      height: 100%;
    }

    /* Only plays for picture in picture, kept rendered so it can play */
    video {
      position: absolute;
      top: 0;
      left: 0;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-mjpeg-player": HaMjpegPlayer;
  }
}
