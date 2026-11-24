import type { ContextType } from "@lit/context";
import { STATE_RUNNING } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { consume } from "../common/decorators/consume";
import { fireEvent, type HASSDomEvent } from "../common/dom/fire_event";
import { loadImage } from "../common/dom/load-image";
import { supportsFeature } from "../common/entity/supports-feature";
import {
  CameraEntityFeature,
  computeMJPEGStreamUrl,
  fetchCameraCapabilities,
  fetchThumbnailUrlWithCache,
  STREAM_TYPE_HLS,
  STREAM_TYPE_WEB_RTC,
  type CameraCapabilities,
  type CameraEntity,
} from "../data/camera";
import {
  computeCameraStreamStatus,
  MJPEG_STREAM,
  selectCameraStreams,
  type CameraStream,
  type CameraStreamStatus,
  type CameraStreamTracks,
  type CameraStreamType,
} from "../data/camera-streams";
import {
  apiContext,
  configContext,
  connectionContext,
  formattersContext,
} from "../data/context";
import "./ha-hls-player";
import type { HaHLSPlayer } from "./ha-hls-player";
import "./ha-mjpeg-player";
import type { HaMjpegPlayer } from "./ha-mjpeg-player";
import "./ha-web-rtc-player";
import type { HaWebRtcPlayer } from "./ha-web-rtc-player";

export type {
  CameraStreamStatus,
  CameraStreamType,
} from "../data/camera-streams";

@customElement("ha-camera-stream")
export class HaCameraStream extends LitElement {
  @state()
  @consume({ context: configContext, subscribe: true })
  private _config!: ContextType<typeof configContext>;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  @state()
  @consume({ context: formattersContext, subscribe: true })
  private _formatters?: ContextType<typeof formattersContext>;

  @property({ attribute: false }) public stateObj?: CameraEntity;

  @property({ attribute: false }) public aspectRatio?: number;

  @property({ attribute: false }) public fitMode?: "cover" | "contain" | "fill";

  @property({ type: Boolean, attribute: "controls" })
  public controls = false;

  @property({ type: Boolean, attribute: "muted" })
  public muted = false;

  @property({ type: Boolean, attribute: "allow-exoplayer" })
  public allowExoPlayer = false;

  /**
   * Shows an MJPEG stream in a player that can also open it picture in
   * picture, which copies its frames into a video while open.
   */
  @property({ type: Boolean, attribute: "mjpeg-video" })
  public mjpegVideo = false;

  /**
   * Loads the poster first to tell its size with
   * `camera-poster-size-changed`, so a player can make room for it before
   * the stream loads.
   */
  @property({ type: Boolean, attribute: "measure-poster" })
  public measurePoster = false;

  // Video background image before its loaded
  @state() private _posterUrl?: string;

  @state() private _connected = false;

  @state() private _capabilities?: CameraCapabilities;

  @state() private _hlsStreams?: CameraStreamTracks;

  @state() private _webRtcStreams?: CameraStreamTracks;

  // Streams that played their first frame
  @state() private _loadedStreams: ReadonlySet<CameraStreamType> = new Set();

  // The app plays the HLS stream in its own player, over the page
  @state() private _hlsInApp = false;

  @query("ha-web-rtc-player") private _webRtcPlayer?: HaWebRtcPlayer;

  @query("ha-mjpeg-player") private _mjpegPlayer?: HaMjpegPlayer;

  @query(
    "ha-hls-player:not(.hidden), ha-web-rtc-player:not(.hidden), ha-mjpeg-player"
  )
  private _visiblePlayer?: HaHLSPlayer | HaWebRtcPlayer | HaMjpegPlayer;

  private _visibleStreamType?: CameraStreamType;

  private _status?: CameraStreamStatus;

  private _capabilitiesRequest = 0;

  private _thumbnailApi = memoizeOne(
    (
      api: ContextType<typeof apiContext>,
      connection: ContextType<typeof connectionContext>
    ) => ({
      callWS: api.callWS,
      hassUrl: connection.hassUrl,
    })
  );

  public willUpdate(changedProps: PropertyValues): void {
    const entityChanged =
      changedProps.has("stateObj") &&
      this.stateObj &&
      (changedProps.get("stateObj") as CameraEntity | undefined)?.entity_id !==
        this.stateObj.entity_id;

    const oldConfig = changedProps.get("_config") as
      ContextType<typeof configContext> | undefined;
    const backendStarted =
      changedProps.has("_config") &&
      this._config &&
      this.stateObj &&
      oldConfig &&
      this._config.config.state === STATE_RUNNING &&
      oldConfig.config?.state !== STATE_RUNNING;

    if (entityChanged || backendStarted) {
      this._getCapabilities();
      this._getPosterUrl();
    }

    const oldConnection = changedProps.get("_connection") as
      ContextType<typeof connectionContext> | undefined;
    if (
      oldConnection &&
      !oldConnection.connected &&
      this._connection.connected
    ) {
      // An MJPEG stream doesn't come back on its own
      this._restartMjpeg();
    }
  }

  /** The microphone track sent to the camera, only on WebRTC streams. */
  public get microphoneTrack(): MediaStreamTrack | undefined {
    return this._webRtcPlayer?.microphoneTrack;
  }

  /** The video of the shown stream. */
  public get videoElement(): HTMLVideoElement | undefined {
    return this._visiblePlayer?.videoElement;
  }

  /**
   * The size of the shown stream's picture, before it is fit into the
   * player. Undefined until it is known.
   */
  public get pictureSize(): { width: number; height: number } | undefined {
    const player = this._visiblePlayer;
    if (player && player === this._mjpegPlayer) {
      return this._mjpegPlayer.pictureSize;
    }
    const video = player?.videoElement;
    return video?.videoWidth
      ? { width: video.videoWidth, height: video.videoHeight }
      : undefined;
  }

  /** Opens the video of the shown stream picture in picture. */
  public async requestPictureInPicture() {
    const player = this._visiblePlayer;
    // An MJPEG stream first has to start copying its image into the video
    if (player && "requestPictureInPicture" in player) {
      await player.requestPictureInPicture();
      return;
    }
    await this.videoElement?.requestPictureInPicture();
  }

  /** Toggles sending the microphone to the camera, only on WebRTC streams. */
  public async toggleMicrophone() {
    await this._webRtcPlayer?.toggleMicrophone();
  }

  public connectedCallback() {
    super.connectedCallback();
    this._connected = true;
    if (this.hasUpdated) {
      // The players start again when reattached, so their results do as well
      this._resetStreams();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._connected = false;
  }

  protected updated(changedProps: PropertyValues<this>): void {
    super.updated(changedProps);
    if ((changedProps as PropertyValues).has("_capabilities")) {
      fireEvent(this, "camera-capabilities-changed", {
        capabilities: this._capabilities,
      });
    }
    const streams = this._currentStreams();
    const visibleStreamType = streams.find((stream) => stream.visible)?.type;
    if (visibleStreamType !== this._visibleStreamType) {
      this._visibleStreamType = visibleStreamType;
      fireEvent(this, "stream-type-changed", { type: visibleStreamType });
    }
    const status: CameraStreamStatus = {
      ...computeCameraStreamStatus(
        streams,
        // Nothing plays while Home Assistant is disconnected
        this._connection.connected ? this._loadedStreams : new Set(),
        this._hlsStreams,
        this._webRtcStreams
      ),
      inApp: visibleStreamType === STREAM_TYPE_HLS && this._hlsInApp,
    };
    if (
      !this._status ||
      status.type !== this._status.type ||
      status.connecting !== this._status.connecting ||
      status.upgrading !== this._status.upgrading ||
      status.hasAudio !== this._status.hasAudio ||
      status.inApp !== this._status.inApp
    ) {
      this._status = status;
      fireEvent(this, "camera-stream-status-changed", status);
    }
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }
    const streams = this._currentStreams();
    return html`${repeat(
      streams,
      (stream) => stream.type + this.stateObj!.entity_id,
      (stream) => this._renderStream(stream)
    )}`;
  }

  private _renderStream(stream: CameraStream) {
    if (!this.stateObj) {
      return nothing;
    }
    if (stream.type === MJPEG_STREAM) {
      const mjpegPath = computeMJPEGStreamUrl(this.stateObj);
      const streamUrl = __DEMO__
        ? this.stateObj.attributes.entity_picture
        : this._connected
          ? // Like the other streams, as the frontend can be served elsewhere
            mjpegPath && this._connection.hassUrl(mjpegPath)
          : this._posterUrl;
      if (!streamUrl) {
        return nothing;
      }
      if (this.mjpegVideo) {
        return html`<ha-mjpeg-player
          .src=${streamUrl}
          .alt=${`Preview of the ${this._formatters?.formatEntityName(this.stateObj) ?? ""} camera.`}
          .aspectRatio=${this.aspectRatio}
          .fitMode=${this.fitMode}
          @load=${this._handleMjpegLoad}
        ></ha-mjpeg-player>`;
      }
      return html`<img
        .src=${streamUrl}
        style=${styleMap({
          aspectRatio: this.aspectRatio,
          objectFit: this.fitMode,
        })}
        alt=${`Preview of the ${this._formatters?.formatEntityName(this.stateObj) ?? ""} camera.`}
        @load=${this._handleImageLoad}
      />`;
    }

    if (stream.type === STREAM_TYPE_HLS) {
      return html`<ha-hls-player
        autoplay
        playsinline
        .allowExoPlayer=${this.allowExoPlayer}
        .muted=${this.muted}
        .controls=${this.controls}
        .entityid=${this.stateObj.entity_id}
        .posterUrl=${this._posterUrl}
        @streams=${this._handleHlsStreams}
        @load=${this._handleHlsLoad}
        @exoplayer-changed=${this._handleExoPlayerChanged}
        class=${stream.visible ? "" : "hidden"}
        .aspectRatio=${this.aspectRatio}
        .fitMode=${this.fitMode}
      ></ha-hls-player>`;
    }

    if (stream.type === STREAM_TYPE_WEB_RTC) {
      return html`<ha-web-rtc-player
        autoplay
        playsinline
        .muted=${this.muted}
        .controls=${this.controls}
        .entityid=${this.stateObj.entity_id}
        .posterUrl=${this._posterUrl}
        @streams=${this._handleWebRtcStreams}
        @load=${this._handleWebRtcLoad}
        class=${stream.visible ? "" : "hidden"}
        .aspectRatio=${this.aspectRatio}
        .fitMode=${this.fitMode}
      ></ha-web-rtc-player>`;
    }

    return nothing;
  }

  private _currentStreams() {
    return this._streams(
      this._capabilities?.frontend_stream_types,
      this._hlsStreams,
      this._webRtcStreams
    );
  }

  private async _getCapabilities() {
    this._capabilities = undefined;
    this._resetStreams();
    const request = ++this._capabilitiesRequest;
    if (!supportsFeature(this.stateObj!, CameraEntityFeature.STREAM)) {
      this._capabilities = {
        frontend_stream_types: [],
        two_way_audio: false,
      };
      return;
    }
    const capabilities = await fetchCameraCapabilities(
      this._api,
      this.stateObj!.entity_id
    );
    if (request !== this._capabilitiesRequest) {
      return;
    }
    this._capabilities = capabilities;
  }

  private _resetStreams() {
    this._hlsStreams = undefined;
    this._webRtcStreams = undefined;
    this._loadedStreams = new Set();
    this._hlsInApp = false;
    this._mjpegPlayer?.restart();
  }

  private _restartMjpeg() {
    this._setLoaded(MJPEG_STREAM, false);
    this._mjpegPlayer?.restart();
  }

  private _setLoaded(type: CameraStreamType, loaded: boolean) {
    if (this._loadedStreams.has(type) === loaded) {
      return;
    }
    const loadedStreams = new Set(this._loadedStreams);
    if (loaded) {
      loadedStreams.add(type);
    } else {
      loadedStreams.delete(type);
    }
    this._loadedStreams = loadedStreams;
  }

  private async _getPosterUrl(): Promise<void> {
    const entityId = this.stateObj!.entity_id;
    let posterUrl: string | undefined;
    try {
      posterUrl = await fetchThumbnailUrlWithCache(
        this._thumbnailApi(this._api, this._connection),
        entityId,
        this.clientWidth,
        this.clientHeight
      );
    } catch (_err: any) {
      // poster url is optional
    }
    if (!this.measurePoster) {
      if (this.stateObj?.entity_id === entityId) {
        this._posterUrl = posterUrl;
      }
      return;
    }
    // Loaded here first for its size, the poster then uses the same image
    // instead of asking the camera again
    const poster = posterUrl ? await loadImage(posterUrl) : undefined;
    if (this.stateObj?.entity_id !== entityId) {
      return;
    }
    this._posterUrl = posterUrl;
    fireEvent(
      this,
      "camera-poster-size-changed",
      {
        size: poster?.naturalWidth
          ? { width: poster.naturalWidth, height: poster.naturalHeight }
          : undefined,
      },
      { bubbles: false, composed: false }
    );
  }

  private _handleImageLoad() {
    this._setLoaded(MJPEG_STREAM, true);
    fireEvent(this, "load");
  }

  private _handleMjpegLoad() {
    this._setLoaded(MJPEG_STREAM, true);
  }

  private _handleHlsLoad() {
    this._setLoaded(STREAM_TYPE_HLS, true);
  }

  private _handleExoPlayerChanged(
    ev: HASSDomEvent<HASSDomEvents["exoplayer-changed"]>
  ) {
    this._hlsInApp = ev.detail.active;
  }

  private _handleWebRtcLoad() {
    this._setLoaded(STREAM_TYPE_WEB_RTC, true);
  }

  private _handleHlsStreams(ev: HASSDomEvent<HASSDomEvents["streams"]>) {
    this._hlsStreams = ev.detail;
    if (!ev.detail.hasVideo) {
      this._setLoaded(STREAM_TYPE_HLS, false);
    }
  }

  private _handleWebRtcStreams(ev: HASSDomEvent<HASSDomEvents["streams"]>) {
    if (
      !ev.detail.hasVideo &&
      !ev.detail.hasAudio &&
      this._capabilities?.frontend_stream_types.length === 1 &&
      typeof RTCPeerConnection !== "undefined"
    ) {
      // Without another stream type, keep the player to show why it failed.
      // Only a browser without WebRTC falls back to MJPEG.
      this._setLoaded(STREAM_TYPE_WEB_RTC, false);
      return;
    }
    this._webRtcStreams = ev.detail;
    if (!ev.detail.hasVideo) {
      this._setLoaded(STREAM_TYPE_WEB_RTC, false);
    }
  }

  private _streams = memoizeOne(
    (
      supportedTypes?: CameraCapabilities["frontend_stream_types"],
      hlsStreams?: CameraStreamTracks,
      webRtcStreams?: CameraStreamTracks
    ): CameraStream[] => {
      if (__DEMO__) {
        return [{ type: MJPEG_STREAM, visible: true }];
      }
      return selectCameraStreams({
        supportedTypes,
        hlsStreams,
        webRtcStreams,
      });
    }
  );

  static styles = css`
    :host,
    img,
    ha-mjpeg-player {
      display: block;
    }

    img {
      width: 100%;
    }

    ha-web-rtc-player {
      width: 100%;
      height: 100%;
    }

    ha-hls-player {
      width: 100%;
      height: 100%;
    }

    .hidden {
      display: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-camera-stream": HaCameraStream;
  }
  interface HASSDomEvents {
    load: undefined;
    "stream-type-changed": { type?: CameraStreamType };
    "camera-capabilities-changed": { capabilities?: CameraCapabilities };
    "camera-stream-status-changed": CameraStreamStatus;
    "camera-poster-size-changed": { size?: { width: number; height: number } };
    streams: {
      hasAudio: boolean;
      hasVideo: boolean;
      codecs?: string[];
    };
  }
}
