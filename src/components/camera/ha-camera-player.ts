import {
  mdiFullscreen,
  mdiFullscreenExit,
  mdiMagnifyMinusOutline,
  mdiPictureInPictureBottomRight,
  mdiPictureInPictureBottomRightOutline,
  mdiVolumeHigh,
  mdiVolumeOff,
} from "@mdi/js";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
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
  isZoomed,
  panBy,
  ZOOM_PAN_IDENTITY,
  zoomAtPoint,
  type ZoomPan,
} from "./zoom-pan";

// How long the controls stay after the last interaction
const CONTROLS_TIMEOUT = 3000;

// How long the hint to hold the modifier key to zoom stays
const WHEEL_HINT_TIMEOUT = 1500;

// Movement in pixels up to which a press is a tap rather than a drag
const TAP_SLOP = 10;

const TAP_MAX_DURATION = 300;

// Zoom per pixel scrolled, a mouse wheel notch scrolls about 100 pixels
const WHEEL_ZOOM_SPEED = 0.0025;

interface PointerInfo {
  x: number;
  y: number;
  startX: number;
  startY: number;
  startTime: number;
  type: string;
}

// Only Safari on iPhone can't show elements full screen, only the video
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

  @state() private _status: CameraStreamStatus = {
    connecting: true,
    hasAudio: false,
  };

  @state() private _capabilities?: CameraCapabilities;

  @state() private _video?: HTMLVideoElement;

  @state() private _muted = false;

  @state() private _controlsVisible = true;

  @state() private _zoom: ZoomPan = ZOOM_PAN_IDENTITY;

  @state() private _gesture = false;

  @state() private _fullscreen = false;

  @state() private _pictureInPicture = false;

  @state() private _wheelHint = false;

  @query("ha-camera-stream") private _stream?: HaCameraStream;

  @query(".player") private _player?: HTMLElement;

  @query(".viewport") private _viewport?: HTMLElement;

  @query(".overlay") private _overlay?: HTMLElement;

  private _pointers = new Map<number, PointerInfo>();

  private _controlsTimeout?: number;

  private _wheelHintTimeout?: number;

  private _videoRequest = 0;

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
    document.addEventListener("fullscreenchange", this._fullscreenChanged);
    document.addEventListener(
      "webkitfullscreenchange",
      this._fullscreenChanged
    );
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
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
    }
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("_video")) {
      this._unbindVideo(changedProps.get("_video") as HTMLVideoElement);
      this._bindVideo(this._video);
    }
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }
    const zoomed = isZoomed(this._zoom);
    const status = this._status;
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
          @pointerdown=${this._pointerDown}
          @pointerup=${this._pointerUp}
          @pointercancel=${this._pointerCancel}
          @dblclick=${this._doubleClick}
          @wheel=${this._wheelListener}
        >
          <ha-camera-stream
            .stateObj=${this.stateObj}
            .allowExoPlayer=${this.allowExoPlayer}
            .muted=${this._muted}
            mjpeg-video
            style=${styleMap({
              transform: zoomed
                ? `translate(${this._zoom.x}px, ${this._zoom.y}px) scale(${this._zoom.scale})`
                : undefined,
            })}
            @camera-stream-status-changed=${this._statusChanged}
            @camera-capabilities-changed=${this._capabilitiesChanged}
          ></ha-camera-stream>
        </div>
        <div
          class=${classMap({ overlay: true, visible: this._controlsVisible })}
        >
          <div class="row">
            <ha-camera-stream-badge
              .status=${status}
              @click=${this._showStreamInfo}
            ></ha-camera-stream-badge>
            <div class="group">
              ${
                this._wheelHint
                  ? html`<span class="wheel-hint" aria-hidden="true">
                      ${this._localize(
                        "ui.components.camera-player.zoom_hint",
                        { modifier: ctrlOrCmdLabel(this._localize) }
                      )}
                    </span>`
                  : nothing
              }
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
      </div>
    `;
  }

  // Controls

  private _showControls = () => {
    this._controlsVisible = true;
    this._scheduleHideControls();
  };

  private _scheduleHideControls() {
    clearTimeout(this._controlsTimeout);
    this._controlsTimeout = window.setTimeout(() => {
      this._controlsTimeout = undefined;
      // Stay while the mouse is on a control
      if (
        this._overlay?.querySelector(
          ".control:hover, ha-camera-stream-badge:hover"
        )
      ) {
        this._scheduleHideControls();
        return;
      }
      this._controlsVisible = false;
    }, CONTROLS_TIMEOUT);
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

  private _showStreamInfo() {
    showCameraStreamInfoDialog(this, {
      status: this._status,
      supportedTypes: this._capabilities?.frontend_stream_types,
    });
  }

  // Video

  private async _updateVideo() {
    const request = ++this._videoRequest;
    // The players render their video after the stream renders them
    await nextRender();
    if (request !== this._videoRequest) {
      return;
    }
    this._video = this._stream?.videoElement;
    if (!this._status.connecting) {
      this._ensurePlaying();
    }
  }

  /** Browsers can block playing with sound, then it plays muted instead. */
  private async _ensurePlaying() {
    const video = this._video;
    if (!video || !video.paused) {
      return;
    }
    try {
      await video.play();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        this._muted = true;
        video.muted = true;
        await video.play().catch(() => undefined);
      }
    }
  }

  private _bindVideo(video?: HTMLVideoElement) {
    if (!video) {
      this._pictureInPicture = false;
      return;
    }
    video.addEventListener(
      "enterpictureinpicture",
      this._pictureInPictureChanged
    );
    video.addEventListener(
      "leavepictureinpicture",
      this._pictureInPictureChanged
    );
    this._pictureInPictureChanged();
  }

  private _unbindVideo(video?: HTMLVideoElement) {
    video?.removeEventListener(
      "enterpictureinpicture",
      this._pictureInPictureChanged
    );
    video?.removeEventListener(
      "leavepictureinpicture",
      this._pictureInPictureChanged
    );
  }

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

  private _pictureInPictureChanged = () => {
    this._pictureInPicture = Boolean(
      this._video && document.pictureInPictureElement === this._video
    );
  };

  private async _togglePictureInPicture() {
    try {
      if (this._pictureInPicture) {
        await document.exitPictureInPicture();
      } else {
        await this._video?.requestPictureInPicture();
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

  // Zoom and pan

  private _viewportSize() {
    const rect = this._viewport!.getBoundingClientRect();
    return { rect, size: { width: rect.width, height: rect.height } };
  }

  private _resetZoom() {
    this._zoom = ZOOM_PAN_IDENTITY;
  }

  private _wheel(ev: WheelEvent) {
    if (!this._viewport) {
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
    const { rect, size } = this._viewportSize();
    // Lines instead of pixels, like in Firefox with a mouse wheel
    const delta =
      ev.deltaMode === WheelEvent.DOM_DELTA_LINE ? ev.deltaY * 33 : ev.deltaY;
    const clampedDelta = Math.max(-100, Math.min(100, delta));
    this._zoom = zoomAtPoint(
      this._zoom,
      this._zoom.scale * Math.exp(-clampedDelta * WHEEL_ZOOM_SPEED),
      { x: ev.clientX - rect.left, y: ev.clientY - rect.top },
      size
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

  private _doubleClick(ev: MouseEvent) {
    if (!this._viewport) {
      return;
    }
    if (isZoomed(this._zoom)) {
      this._resetZoom();
      return;
    }
    const { rect, size } = this._viewportSize();
    this._zoom = zoomAtPoint(
      this._zoom,
      2,
      { x: ev.clientX - rect.left, y: ev.clientY - rect.top },
      size
    );
  }

  private _pointerDown(ev: PointerEvent) {
    if (ev.pointerType === "mouse" && ev.button !== 0) {
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
    if (this._pointers.size > 1 || isZoomed(this._zoom)) {
      this._gesture = true;
      (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
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
    const { rect, size } = this._viewportSize();

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
      const zoomed = zoomAtPoint(
        this._zoom,
        (this._zoom.scale * newDistance) / oldDistance,
        { x: newCenter.x - rect.left, y: newCenter.y - rect.top },
        size
      );
      this._zoom = panBy(
        zoomed,
        newCenter.x - oldCenter.x,
        newCenter.y - oldCenter.y,
        size
      );
      return;
    }

    const dx = ev.clientX - pointer.x;
    const dy = ev.clientY - pointer.y;
    pointer.x = ev.clientX;
    pointer.y = ev.clientY;
    if (this._pointers.size === 1 && isZoomed(this._zoom)) {
      this._zoom = panBy(this._zoom, dx, dy, size);
    }
  }

  private _pointerUp(ev: PointerEvent) {
    const pointer = this._pointers.get(ev.pointerId);
    const wasSingle = this._pointers.size === 1;
    this._pointers.delete(ev.pointerId);
    if (!this._pointers.size) {
      this._gesture = false;
    }
    if (!pointer || !wasSingle) {
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
    }
  }

  private _pointerLeave(ev: PointerEvent) {
    if (ev.pointerType === "mouse" && !this._pointers.size) {
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

    .player.fullscreen {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      --video-max-height: 100vh;
    }

    .player.fullscreen.idle {
      cursor: none;
    }

    .viewport {
      position: relative;
      overflow: hidden;
      /* Scrolls the page until zoomed in, pinches are handled here */
      touch-action: pan-x pan-y;
    }

    .player.fullscreen .viewport,
    .player.fullscreen ha-camera-stream {
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

    ha-camera-stream {
      transform-origin: 0 0;
      transition: transform var(--ha-animation-duration-fast, 150ms) ease-out;
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

    .control {
      opacity: 0;
      transition: opacity var(--ha-animation-duration-normal, 250ms) ease-in-out;
    }

    /* The connection always shows, like the mute button while muted */
    .overlay.visible .control,
    .control.pinned,
    ha-camera-stream-badge {
      opacity: 1;
      pointer-events: auto;
    }

    /* Readable on a dark and on a bright picture */
    .control {
      --ha-icon-button-size: 40px;
      --mdc-icon-size: 22px;
      color: white;
      background-color: rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: var(--ha-border-radius-circle);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
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
      color: white;
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-medium);
      white-space: nowrap;
      animation: fade-in var(--ha-animation-duration-fast, 150ms) ease-out;
    }

    @keyframes fade-in {
      from {
        opacity: 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      ha-camera-stream {
        transition: none;
      }
      .wheel-hint {
        animation: none;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-camera-player": HaCameraPlayer;
  }
}
