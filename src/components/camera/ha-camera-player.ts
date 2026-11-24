import { ResizeController } from "@lit-labs/observers/resize-controller";
import {
  mdiFullscreen,
  mdiFullscreenExit,
  mdiMagnifyMinusOutline,
  mdiPictureInPictureBottomRight,
  mdiPictureInPictureBottomRightOutline,
  mdiPlay,
  mdiVolumeHigh,
  mdiVolumeOff,
} from "@mdi/js";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import { storage } from "../../common/decorators/storage";
import { deepActiveElement } from "../../common/dom/deep-active-element";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { ctrlOrCmdLabel } from "../../common/keyboard/ctrl-or-cmd";
import type { LocalizeFunc } from "../../common/translations/localize";
import { nextRender } from "../../common/util/render-status";
import type { CameraCapabilities, CameraEntity } from "../../data/camera";
import type { CameraStreamStatus } from "../../data/camera-streams";
import { showCameraStreamInfoDialog } from "../../dialogs/camera/show-dialog-camera-stream-info";
import "../ha-camera-stream";
import type { HaCameraStream } from "../ha-camera-stream";
import "../ha-icon-button";
import "../ha-spinner";
import "../ha-svg-icon";
import "./ha-camera-stream-badge";
import {
  fitPicture,
  isZoomed,
  panBy,
  refitZoomPan,
  visiblePart,
  ZOOM_PAN_IDENTITY,
  zoomAtPoint,
  type ZoomPan,
  type ZoomPanSize,
  type ZoomPanViewport,
} from "./zoom-pan";

const CONTROLS_TIMEOUT = 3000;

const WHEEL_HINT_TIMEOUT = 1500;

// Movement in pixels up to which a press is a tap rather than a drag
const TAP_SLOP = 10;

const TAP_MAX_DURATION = 300;

// Zoom per pixel scrolled, a mouse wheel notch scrolls about 100 pixels
const WHEEL_ZOOM_SPEED = 0.0025;

// The longer side of the minimap of a zoomed in picture, in pixels
const MINIMAP_SIZE = 64;

// Most cameras, for the room the player keeps until it knows the picture
const DEFAULT_ASPECT_RATIO = 16 / 9;

interface PointerInfo {
  x: number;
  y: number;
  startX: number;
  startY: number;
  startTime: number;
  type: string;
}

// Safari on iPhone can only show a video full screen, not other elements
interface WebKitVideoElement extends HTMLVideoElement {
  webkitEnterFullscreen?: () => void;
  webkitSupportsFullscreen?: boolean;
}

/**
 * Plays a live camera stream with its own controls, which look the same in
 * every browser: the connection of the stream, sound, picture in picture and
 * full screen. It zooms with ctrl or cmd and the scroll wheel, a pinch or a
 * double click, and pans by dragging while zoomed in. The scroll wheel alone
 * keeps scrolling the page around it.
 */
@customElement("ha-camera-player")
export class HaCameraPlayer extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @property({ attribute: false }) public stateObj?: CameraEntity;

  @property({ type: Boolean, attribute: "allow-exoplayer" })
  public allowExoPlayer = false;

  /** Keeps the screen on while the player shows, like in the more info. */
  @property({ type: Boolean, attribute: "keep-awake" })
  public keepAwake = false;

  @state() private _status: CameraStreamStatus = {
    connecting: true,
    hasAudio: false,
  };

  @state() private _capabilities?: CameraCapabilities;

  @state() private _video?: HTMLVideoElement;

  @state() private _muted = false;

  @state() private _controlsVisible = true;

  @state() private _zoom: ZoomPan = ZOOM_PAN_IDENTITY;

  @state() private _pictureSize?: ZoomPanSize;

  // Known before the stream's picture, so the player can make room for it
  @state() private _posterSize?: ZoomPanSize;

  // Of each camera's picture last time, so the player opens at its size
  @storage({ key: "cameraAspectRatios", state: true, subscribe: false })
  private _storedAspectRatios?: Record<string, number>;

  @state() private _gesture = false;

  @state() private _fullscreen = false;

  @state() private _pictureInPicture = false;

  @state() private _wheelHint = false;

  // Paused from outside, like in picture in picture or the iPhone's own
  // full screen player
  @state() private _paused = false;

  @query("ha-camera-stream") private _stream?: HaCameraStream;

  @query(".player") private _player?: HTMLElement;

  @query(".viewport") private _viewport?: HTMLElement;

  @query(".overlay") private _overlay?: HTMLElement;

  private _pointers = new Map<number, PointerInfo>();

  // More than one finger touched since all were lifted, so it is no tap
  private _multiPointer = false;

  // The viewport and picture the zoom was last made for
  private _zoomViewport: ZoomPanViewport = fitPicture({ width: 0, height: 0 });

  private _viewportResize = new ResizeController(this, {
    target: null,
    skipInitial: true,
    callback: () => this._refitZoom(),
  });

  private _controlsTimeout?: number;

  private _wheelHintTimeout?: number;

  private _videoRequest = 0;

  private _wakeLock?: WakeLockSentinel;

  // Increased on every request and release, so older requests are dropped
  private _wakeLockRequest = 0;

  // Not passive, so zooming can keep the page from scrolling
  private _wheelListener = {
    handleEvent: (ev: WheelEvent) => this._wheel(ev),
    passive: false,
  };

  /** The microphone track sent to the camera, only on WebRTC streams. */
  public get microphoneTrack(): MediaStreamTrack | undefined {
    return this._stream?.microphoneTrack;
  }

  /** Toggles sending the microphone to the camera, only on WebRTC streams. */
  public async toggleMicrophone() {
    await this._stream?.toggleMicrophone();
  }

  public connectedCallback() {
    super.connectedCallback();
    document.addEventListener("visibilitychange", this._requestWakeLock);
    // The first update requests it, once keep-awake is set
    if (this.hasUpdated) {
      this._requestWakeLock();
    }
    document.addEventListener("fullscreenchange", this._fullscreenChanged);
    document.addEventListener(
      "webkitfullscreenchange",
      this._fullscreenChanged
    );
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("visibilitychange", this._requestWakeLock);
    this._releaseWakeLock();
    document.removeEventListener("fullscreenchange", this._fullscreenChanged);
    document.removeEventListener(
      "webkitfullscreenchange",
      this._fullscreenChanged
    );
    clearTimeout(this._controlsTimeout);
    clearTimeout(this._wheelHintTimeout);
    this._unbindVideo(this._video);
    this._video = undefined;
    this._pointers.clear();
  }

  protected willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);
    const oldStateObj = changedProps.get("stateObj");
    if (oldStateObj && oldStateObj.entity_id !== this.stateObj?.entity_id) {
      this._zoom = ZOOM_PAN_IDENTITY;
      this._pictureSize = undefined;
      this._posterSize = undefined;
    }
  }

  protected firstUpdated() {
    if (this._viewport) {
      this._viewportResize.observe(this._viewport);
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("keepAwake")) {
      if (this.keepAwake) {
        this._requestWakeLock();
      } else {
        this._releaseWakeLock();
      }
    }
    if (changedProps.has("_video")) {
      this._unbindVideo(changedProps.get("_video") as HTMLVideoElement);
      this._bindVideo(this._video);
    }
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }
    const status = this._status;
    // The app plays the stream in its own player over the page, which the
    // controls and zoom of this one can't reach, so it shows just the stream
    const inApp = Boolean(status.inApp);
    const zoomed = !inApp && isZoomed(this._zoom);
    // Stays while the connection changes, so the user sees what happens
    const badgeVisible =
      this._controlsVisible ||
      status.connecting ||
      status.upgrading !== undefined;

    return html`
      <div
        class=${classMap({
          player: true,
          fullscreen: this._fullscreen,
          idle: !this._controlsVisible,
        })}
        @pointermove=${this._pointerMove}
        @pointerleave=${this._pointerLeave}
        @focusin=${this._showControls}
      >
        <div
          class=${classMap({
            viewport: true,
            zoomed,
            "camera-player-zoomed": zoomed,
            gesture: this._gesture,
          })}
          style=${styleMap({
            aspectRatio: this._fullscreen
              ? undefined
              : String(this._aspectRatio()),
          })}
          @pointerdown=${this._pointerDown}
          @pointerup=${this._pointerUp}
          @pointercancel=${this._pointerCancel}
          @lostpointercapture=${this._pointerCancel}
          @dblclick=${this._doubleClick}
          @dragstart=${this._preventDrag}
          @wheel=${this._wheelListener}
        >
          <ha-camera-stream
            .stateObj=${this.stateObj}
            .allowExoPlayer=${this.allowExoPlayer}
            .muted=${this._muted}
            mjpeg-video
            measure-poster
            style=${styleMap({
              transform: zoomed
                ? `translate(${this._zoom.x}px, ${this._zoom.y}px) scale(${this._zoom.scale})`
                : undefined,
            })}
            @camera-stream-status-changed=${this._statusChanged}
            @load=${this._updateVideo}
            @camera-capabilities-changed=${this._capabilitiesChanged}
            @camera-poster-size-changed=${this._posterSizeChanged}
          ></ha-camera-stream>
        </div>
        ${inApp ? nothing : this._renderControls(status, zoomed, badgeVisible)}
      </div>
    `;
  }

  private _renderControls(
    status: CameraStreamStatus,
    zoomed: boolean,
    badgeVisible: boolean
  ) {
    return html`
      ${
        this._paused && !status.connecting
          ? html`<ha-icon-button
              class="control pinned play"
              .label=${this._localize("ui.components.camera-player.play")}
              .path=${mdiPlay}
              @click=${this._ensurePlaying}
            ></ha-icon-button>`
          : nothing
      }
      <div class=${classMap({ overlay: true, visible: this._controlsVisible })}>
        <div class="row">
          <ha-camera-stream-badge
            class=${classMap({ visible: badgeVisible })}
            .status=${status}
            @click=${this._showStreamInfo}
          ></ha-camera-stream-badge>
          <div class="group">
            ${
              this._wheelHint
                ? html`<span class="wheel-hint" aria-hidden="true">
                    ${this._localize("ui.components.camera-player.zoom_hint", {
                      modifier: ctrlOrCmdLabel(this._localize),
                    })}
                  </span>`
                : nothing
            }
            ${zoomed ? this._renderMinimap() : nothing}
            ${
              zoomed
                ? html`<ha-icon-button
                    class="control"
                    .label=${this._localize(
                      "ui.components.camera-player.reset_zoom"
                    )}
                    .path=${mdiMagnifyMinusOutline}
                    @click=${this._resetZoom}
                  ></ha-icon-button>`
                : nothing
            }
          </div>
        </div>
        <div class="row">
          <div class="group">
            ${
              status.hasAudio
                ? html`<ha-icon-button
                    class=${classMap({
                      control: true,
                      // Stays while muted, so it is clear there is sound
                      pinned: this._muted,
                    })}
                    .label=${this._localize(
                      this._muted
                        ? "ui.components.camera-player.unmute"
                        : "ui.components.camera-player.mute"
                    )}
                    .path=${this._muted ? mdiVolumeOff : mdiVolumeHigh}
                    @click=${this._toggleMute}
                  ></ha-icon-button>`
                : nothing
            }
          </div>
          <div class="group">
            ${
              this._supportsPictureInPicture()
                ? html`<ha-icon-button
                    class="control"
                    .label=${this._localize(
                      this._pictureInPicture
                        ? "ui.components.camera-player.exit_picture_in_picture"
                        : "ui.components.camera-player.picture_in_picture"
                    )}
                    .path=${
                      this._pictureInPicture
                        ? mdiPictureInPictureBottomRightOutline
                        : mdiPictureInPictureBottomRight
                    }
                    @click=${this._togglePictureInPicture}
                  ></ha-icon-button>`
                : nothing
            }
            ${
              this._supportsFullscreen()
                ? html`<ha-icon-button
                    class="control"
                    .label=${this._localize(
                      this._fullscreen
                        ? "ui.components.camera-player.exit_fullscreen"
                        : "ui.components.camera-player.fullscreen"
                    )}
                    .path=${this._fullscreen ? mdiFullscreenExit : mdiFullscreen}
                    @click=${this._toggleFullscreen}
                  ></ha-icon-button>`
                : nothing
            }
          </div>
        </div>
      </div>
    `;
  }

  /**
   * The whole picture with the part that shows, so it is clear the zoom is
   * digital and where in the picture it is. Positioned like the picture,
   * which isn't mirrored in right to left languages.
   */
  private _renderMinimap() {
    const { width, height } = this._zoomViewport.picture;
    if (!width || !height) {
      return nothing;
    }
    const longSide = Math.max(width, height);
    const area = visiblePart(this._zoom, this._zoomViewport);
    return html`<div
      class=${classMap({ minimap: true, gesture: this._gesture })}
      style=${styleMap({
        width: `${(MINIMAP_SIZE * width) / longSide}px`,
        height: `${(MINIMAP_SIZE * height) / longSide}px`,
      })}
      aria-hidden="true"
    >
      <div
        class="area"
        style=${styleMap({
          left: `${area.x * 100}%`,
          top: `${area.y * 100}%`,
          width: `${area.width * 100}%`,
          height: `${area.height * 100}%`,
        })}
      ></div>
    </div>`;
  }

  /**
   * Browsers release the lock when the page is hidden, so it is requested
   * again whenever the page shows.
   */
  private _requestWakeLock = async () => {
    if (
      !this.keepAwake ||
      !this.isConnected ||
      this._wakeLock ||
      document.visibilityState !== "visible" ||
      !("wakeLock" in navigator)
    ) {
      return;
    }
    const request = ++this._wakeLockRequest;
    try {
      const wakeLock = await navigator.wakeLock.request("screen");
      if (request !== this._wakeLockRequest) {
        wakeLock.release();
        return;
      }
      this._wakeLock = wakeLock;
      wakeLock.addEventListener("release", () => {
        if (this._wakeLock === wakeLock) {
          this._wakeLock = undefined;
        }
      });
    } catch (_err: unknown) {
      // Not allowed, like without HTTPS or with the battery saver on
    }
  };

  private _releaseWakeLock() {
    this._wakeLockRequest++;
    this._wakeLock?.release();
    this._wakeLock = undefined;
  }

  private _showControls = () => {
    this._controlsVisible = true;
    this._scheduleHideControls();
  };

  private _scheduleHideControls() {
    clearTimeout(this._controlsTimeout);
    this._controlsTimeout = window.setTimeout(() => {
      this._controlsTimeout = undefined;
      if (
        this._overlay?.querySelector(
          ".control:hover, ha-camera-stream-badge:hover"
        ) ||
        this._hasKeyboardFocus()
      ) {
        this._scheduleHideControls();
        return;
      }
      this._controlsVisible = false;
    }, CONTROLS_TIMEOUT);
  }

  private _hasKeyboardFocus(): boolean {
    return Boolean(
      this.shadowRoot &&
      deepActiveElement(this.shadowRoot)?.matches(":focus-visible")
    );
  }

  private _hideControls() {
    clearTimeout(this._controlsTimeout);
    this._controlsTimeout = undefined;
    this._controlsVisible = false;
  }

  private _statusChanged(
    ev: HASSDomEvent<HASSDomEvents["camera-stream-status-changed"]>
  ) {
    const oldStatus = this._status;
    this._status = ev.detail;
    if (ev.detail.inApp) {
      this._zoom = ZOOM_PAN_IDENTITY;
    }
    if (
      oldStatus.connecting !== ev.detail.connecting ||
      oldStatus.type !== ev.detail.type
    ) {
      // Shows the new connection for a moment
      this._showControls();
      this._updateVideo();
    }
  }

  private _capabilitiesChanged(
    ev: HASSDomEvent<HASSDomEvents["camera-capabilities-changed"]>
  ) {
    this._capabilities = ev.detail.capabilities;
  }

  /**
   * Of the stream's picture, until then of the camera's picture last time,
   * its poster or most cameras'.
   */
  private _aspectRatio(): number {
    if (this._pictureSize) {
      return this._pictureSize.width / this._pictureSize.height;
    }
    const stored =
      this.stateObj && this._storedAspectRatios?.[this.stateObj.entity_id];
    if (stored) {
      return stored;
    }
    return this._posterSize
      ? this._posterSize.width / this._posterSize.height
      : DEFAULT_ASPECT_RATIO;
  }

  private _posterSizeChanged(
    ev: HASSDomEvent<HASSDomEvents["camera-poster-size-changed"]>
  ) {
    this._posterSize = ev.detail.size;
  }

  private _showStreamInfo() {
    showCameraStreamInfoDialog(this, {
      status: this._status,
      supportedTypes: this._capabilities?.frontend_stream_types,
    });
  }

  private async _updateVideo() {
    const request = ++this._videoRequest;
    // The players render their video after the stream renders them
    await nextRender();
    if (request !== this._videoRequest) {
      return;
    }
    this._video = this._stream?.videoElement;
    this._updatePictureSize();
    // Binds the video first, which resets its paused state
    await this.updateComplete;
    if (!this._status.connecting) {
      this._ensurePlaying();
    }
  }

  /** Browsers can block playing with sound, then it plays muted instead. */
  private async _ensurePlaying() {
    const video = this._video;
    // An MJPEG stream's video only plays for picture in picture
    if (!video || !video.paused || (!video.srcObject && !video.currentSrc)) {
      return;
    }
    try {
      await video.play();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        this._muted = true;
        video.muted = true;
        await video.play().catch(() => {
          // Blocked completely, only the play button can start it
          if (video === this._video) {
            this._paused = true;
          }
        });
      }
    }
  }

  private _bindVideo(video?: HTMLVideoElement) {
    if (!video) {
      this._pictureInPicture = false;
      this._paused = false;
      return;
    }
    for (const type of ["play", "pause", "emptied"]) {
      video.addEventListener(type, this._updatePaused);
    }
    video.addEventListener("resize", this._updatePictureSize);
    // Only a pause from outside shows the play button, not the moment before
    // a new video starts playing
    this._paused = false;
    video.addEventListener(
      "enterpictureinpicture",
      this._pictureInPictureChanged
    );
    video.addEventListener(
      "leavepictureinpicture",
      this._pictureInPictureChanged
    );
    this._pictureInPicture = false;
  }

  private _unbindVideo(video?: HTMLVideoElement) {
    for (const type of ["play", "pause", "emptied"]) {
      video?.removeEventListener(type, this._updatePaused);
    }
    video?.removeEventListener("resize", this._updatePictureSize);
    video?.removeEventListener(
      "enterpictureinpicture",
      this._pictureInPictureChanged
    );
    video?.removeEventListener(
      "leavepictureinpicture",
      this._pictureInPictureChanged
    );
  }

  // Without a source, like an MJPEG stream's video outside of picture in
  // picture, it isn't paused
  private _updatePaused = () => {
    const video = this._video;
    this._paused = Boolean(
      video?.paused && (video.srcObject || video.currentSrc)
    );
  };

  private _toggleMute() {
    this._muted = !this._muted;
    if (!this._muted) {
      this._ensurePlaying();
    }
  }

  private _supportsPictureInPicture(): boolean {
    return Boolean(
      this._video &&
      document.pictureInPictureEnabled &&
      !this._video.disablePictureInPicture
    );
  }

  // document.pictureInPictureElement is only the outermost shadow host, so
  // the events of the video tell which one it is
  private _pictureInPictureChanged = (ev: Event) => {
    this._pictureInPicture = ev.type === "enterpictureinpicture";
  };

  private async _togglePictureInPicture() {
    try {
      if (this._pictureInPicture) {
        await document.exitPictureInPicture();
      } else {
        await this._stream?.requestPictureInPicture();
      }
    } catch (_err: unknown) {
      // Not possible right now, like before the video has loaded
    }
  }

  private _supportsFullscreen(): boolean {
    const video = this._video as WebKitVideoElement | undefined;
    return (
      document.fullscreenEnabled ||
      ("webkitFullscreenEnabled" in document &&
        Boolean(document.webkitFullscreenEnabled)) ||
      Boolean(video?.webkitSupportsFullscreen)
    );
  }

  private _fullscreenChanged = () => {
    const fullscreenElement =
      this.shadowRoot?.fullscreenElement ??
      ("webkitFullscreenElement" in document
        ? (document.webkitFullscreenElement as Element | null)
        : null);
    const fullscreen = Boolean(
      this._player && fullscreenElement === this._player
    );
    if (fullscreen !== this._fullscreen) {
      this._fullscreen = fullscreen;
      // The size changes, so the zoomed in area would be off
      this._zoom = ZOOM_PAN_IDENTITY;
    }
  };

  private async _toggleFullscreen() {
    const player = this._player;
    if (!player) {
      return;
    }
    try {
      if (this._fullscreen) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ("webkitExitFullscreen" in document) {
          (document.webkitExitFullscreen as () => void)();
        }
        return;
      }
      if (player.requestFullscreen) {
        await player.requestFullscreen();
      } else if ("webkitRequestFullscreen" in player) {
        (player.webkitRequestFullscreen as () => void)();
      } else {
        // Safari on iPhone only shows the video itself full screen, with its
        // own controls
        (
          this._video as WebKitVideoElement | undefined
        )?.webkitEnterFullscreen?.();
      }
    } catch (_err: unknown) {
      // Denied by the browser
    }
  }

  private _updatePictureSize = () => {
    const size = this._stream?.pictureSize;
    if (
      size &&
      (size.width !== this._pictureSize?.width ||
        size.height !== this._pictureSize.height)
    ) {
      this._pictureSize = size;
      this._storeAspectRatio(size.width / size.height);
    }
    // The new picture can have another size
    this._refitZoom();
  };

  private _storeAspectRatio(aspectRatio: number) {
    const entityId = this.stateObj?.entity_id;
    if (!entityId || this._storedAspectRatios?.[entityId] === aspectRatio) {
      return;
    }
    this._storedAspectRatios = {
      ...this._storedAspectRatios,
      [entityId]: aspectRatio,
    };
  }

  private _measureViewport() {
    const rect = this._viewport!.getBoundingClientRect();
    // Kept for the minimap, every zoom and pan measures it first
    this._zoomViewport = fitPicture(
      { width: rect.width, height: rect.height },
      this._stream?.pictureSize ?? this._pictureSize ?? this._posterSize
    );
    return { rect, viewport: this._zoomViewport };
  }

  /**
   * Keeps the same part of the picture in view when the viewport or the
   * picture changes size.
   */
  private _refitZoom = () => {
    const oldViewport = this._zoomViewport;
    if (!isZoomed(this._zoom) || !this._viewport || !oldViewport.width) {
      return;
    }
    const { viewport } = this._measureViewport();
    if (!viewport.width || !viewport.height) {
      return;
    }
    this._zoom = refitZoomPan(this._zoom, oldViewport, viewport);
  };

  private _resetZoom() {
    this._zoom = ZOOM_PAN_IDENTITY;
  }

  private _wheel(ev: WheelEvent) {
    if (!this._viewport || this._status.inApp) {
      return;
    }
    // A pinch on a touchpad scrolls with ctrl held
    if (!ev.ctrlKey && !ev.metaKey) {
      this._showWheelHint();
      return;
    }
    // Also keeps the browser from zooming the whole page
    ev.preventDefault();
    this._hideWheelHint();
    const { rect, viewport } = this._measureViewport();
    // Lines instead of pixels, like in Firefox with a mouse wheel
    const delta =
      ev.deltaMode === WheelEvent.DOM_DELTA_LINE ? ev.deltaY * 33 : ev.deltaY;
    const clampedDelta = Math.max(-100, Math.min(100, delta));
    this._zoom = zoomAtPoint(
      this._zoom,
      this._zoom.scale * Math.exp(-clampedDelta * WHEEL_ZOOM_SPEED),
      { x: ev.clientX - rect.left, y: ev.clientY - rect.top },
      viewport
    );
  }

  private _showWheelHint() {
    this._wheelHint = true;
    clearTimeout(this._wheelHintTimeout);
    this._wheelHintTimeout = window.setTimeout(() => {
      this._wheelHint = false;
    }, WHEEL_HINT_TIMEOUT);
  }

  private _hideWheelHint() {
    clearTimeout(this._wheelHintTimeout);
    this._wheelHint = false;
  }

  private _preventDrag(ev: DragEvent) {
    // Dragging an image, like an MJPEG stream, would drag it out instead of
    // panning
    ev.preventDefault();
  }

  private _doubleClick(ev: MouseEvent) {
    if (!this._viewport || this._status.inApp) {
      return;
    }
    if (isZoomed(this._zoom)) {
      this._resetZoom();
      return;
    }
    const { rect, viewport } = this._measureViewport();
    this._zoom = zoomAtPoint(
      this._zoom,
      2,
      { x: ev.clientX - rect.left, y: ev.clientY - rect.top },
      viewport
    );
  }

  private _pointerDown(ev: PointerEvent) {
    if (this._status.inApp || (ev.pointerType === "mouse" && ev.button !== 0)) {
      return;
    }
    this._pointers.set(ev.pointerId, {
      x: ev.clientX,
      y: ev.clientY,
      startX: ev.clientX,
      startY: ev.clientY,
      startTime: ev.timeStamp,
      type: ev.pointerType,
    });
    // Also a mouse released outside of the player ends its press here
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    if (this._pointers.size > 1) {
      this._multiPointer = true;
    }
    if (this._multiPointer || isZoomed(this._zoom)) {
      this._gesture = true;
    }
  }

  private _pointerMove(ev: PointerEvent) {
    if (ev.pointerType === "mouse" && !this._pointers.size) {
      this._showControls();
    }
    const pointer = this._pointers.get(ev.pointerId);
    if (!pointer || !this._viewport) {
      return;
    }
    const { rect, viewport } = this._measureViewport();

    if (this._pointers.size === 2) {
      const [a, b] = [...this._pointers.values()];
      const oldDistance = Math.hypot(a.x - b.x, a.y - b.y);
      const oldCenter = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      pointer.x = ev.clientX;
      pointer.y = ev.clientY;
      const newDistance = Math.hypot(a.x - b.x, a.y - b.y);
      const newCenter = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      if (!oldDistance) {
        return;
      }
      // Zooms where the fingers were, then moves along with them
      const zoomed = zoomAtPoint(
        this._zoom,
        (this._zoom.scale * newDistance) / oldDistance,
        { x: oldCenter.x - rect.left, y: oldCenter.y - rect.top },
        viewport
      );
      this._zoom = panBy(
        zoomed,
        newCenter.x - oldCenter.x,
        newCenter.y - oldCenter.y,
        viewport
      );
      return;
    }

    const dx = ev.clientX - pointer.x;
    const dy = ev.clientY - pointer.y;
    pointer.x = ev.clientX;
    pointer.y = ev.clientY;
    if (this._pointers.size === 1 && isZoomed(this._zoom)) {
      this._zoom = panBy(this._zoom, dx, dy, viewport);
    }
  }

  private _pointerUp(ev: PointerEvent) {
    const pointer = this._pointers.get(ev.pointerId);
    const multiPointer = this._multiPointer;
    this._pointerCancel(ev);
    if (!pointer || multiPointer) {
      return;
    }
    const isTap =
      Math.hypot(ev.clientX - pointer.startX, ev.clientY - pointer.startY) <
        TAP_SLOP && ev.timeStamp - pointer.startTime < TAP_MAX_DURATION;
    if (!isTap) {
      return;
    }
    // A tap toggles the controls, a mouse already shows them by moving
    if (pointer.type !== "mouse" && this._controlsVisible) {
      this._hideControls();
    } else {
      this._showControls();
    }
  }

  private _pointerCancel(ev: PointerEvent) {
    this._pointers.delete(ev.pointerId);
    if (!this._pointers.size) {
      this._gesture = false;
      this._multiPointer = false;
    }
  }

  private _pointerLeave(ev: PointerEvent) {
    if (
      ev.pointerType === "mouse" &&
      !this._pointers.size &&
      !this._hasKeyboardFocus()
    ) {
      this._hideControls();
    }
  }

  static styles = css`
    :host {
      display: block;
    }

    .player {
      position: relative;
      overflow: hidden;
      background-color: black;
    }

    /* Clear of notches and rounded corners, the picture in the middle */
    .player.fullscreen {
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-right: env(safe-area-inset-right, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
      --safe-left: env(safe-area-inset-left, 0px);
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      padding: var(--safe-top) var(--safe-right) var(--safe-bottom)
        var(--safe-left);
      --video-max-height: calc(100dvh - var(--safe-top) - var(--safe-bottom));
    }

    .player.fullscreen ha-camera-stream {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .player.fullscreen .overlay {
      padding: calc(var(--ha-space-2) + var(--safe-top))
        calc(var(--ha-space-2) + var(--safe-right))
        calc(var(--ha-space-2) + var(--safe-bottom))
        calc(var(--ha-space-2) + var(--safe-left));
    }

    .player.fullscreen.idle {
      cursor: none;
    }

    .viewport {
      position: relative;
      overflow: hidden;
      max-height: var(--video-max-height, calc(100vh - 97px));
      /* As wide as the player also when its height is limited, which the
         aspect ratio would otherwise limit the width with, so the zoomed in
         picture and gestures reach into the bars next to it */
      width: 100%;
      /* Scrolls the page until zoomed in, pinches are handled here */
      touch-action: pan-x pan-y;
      /* From the poster's or a default size to the stream's */
      transition: aspect-ratio var(--ha-animation-duration-normal) ease-out;
    }

    .player.fullscreen .viewport {
      width: 100%;
      height: 100%;
    }

    .viewport.zoomed {
      touch-action: none;
      cursor: grab;
    }

    .viewport.zoomed.gesture {
      cursor: grabbing;
    }

    /* Sized by the viewport, a video without a picture yet would be only
       as high as an empty video */
    ha-camera-stream {
      width: 100%;
      height: 100%;
      transform-origin: 0 0;
      transition: transform var(--ha-animation-duration-fast) ease-out;
    }

    .viewport.gesture ha-camera-stream {
      transition: none;
      will-change: transform;
    }

    .overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: var(--ha-space-2);
      /* Taps between the controls reach the video below */
      pointer-events: none;
    }

    .row,
    .group {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--ha-space-2);
    }

    .control,
    .minimap,
    ha-camera-stream-badge {
      opacity: 0;
      transition: opacity var(--ha-animation-duration-normal) ease-in-out;
    }

    .overlay.visible .control,
    .overlay.visible .minimap,
    .control.pinned,
    ha-camera-stream-badge.visible {
      opacity: 1;
      pointer-events: auto;
    }

    /* Readable on a dark and on a bright picture */
    .control {
      --ha-icon-button-size: 40px;
      --mdc-icon-size: 22px;
      color: var(--ha-color-white);
      background-color: rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: var(--ha-border-radius-circle);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    .play {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1;
      --ha-icon-button-size: 64px;
      --mdc-icon-size: 40px;
    }

    .minimap {
      position: relative;
      flex: none;
      box-sizing: border-box;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: var(--ha-border-radius-sm);
      background-color: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      animation: fade-in var(--ha-animation-duration-fast) ease-out;
    }

    .minimap .area {
      position: absolute;
      box-sizing: border-box;
      border: 1.5px solid var(--ha-color-white);
      border-radius: 2px;
      background-color: rgba(255, 255, 255, 0.2);
      transition:
        left var(--ha-animation-duration-fast) ease-out,
        top var(--ha-animation-duration-fast) ease-out,
        width var(--ha-animation-duration-fast) ease-out,
        height var(--ha-animation-duration-fast) ease-out;
    }

    .minimap.gesture .area {
      transition: none;
    }

    /* Where the reset zoom button comes once zoomed in */
    .wheel-hint {
      display: inline-flex;
      align-items: center;
      height: 28px;
      padding-inline: var(--ha-space-3);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: var(--ha-border-radius-pill);
      background-color: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: var(--ha-color-white);
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-medium);
      white-space: nowrap;
      animation: fade-in var(--ha-animation-duration-fast) ease-out;
    }

    @keyframes fade-in {
      from {
        opacity: 0;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-camera-player": HaCameraPlayer;
  }
}
