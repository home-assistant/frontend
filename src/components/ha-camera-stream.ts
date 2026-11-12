import type { ContextType } from "@lit/context";
import { STATE_RUNNING } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { consume } from "../common/decorators/consume";
import { fireEvent, type HASSDomEvent } from "../common/dom/fire_event";
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
  MJPEG_STREAM,
  selectCameraStreams,
  type CameraStream,
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
import "./ha-web-rtc-player";
import type { HaWebRtcPlayer } from "./ha-web-rtc-player";

export type { CameraStreamType } from "../data/camera-streams";

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

  // Video background image before its loaded
  @state() private _posterUrl?: string;

  @state() private _connected = false;

  @state() private _capabilities?: CameraCapabilities;

  @state() private _hlsStreams?: CameraStreamTracks;

  @state() private _webRtcStreams?: CameraStreamTracks;

  @query("ha-web-rtc-player") private _webRtcPlayer?: HaWebRtcPlayer;

  private _visibleStreamType?: CameraStreamType;

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
  }

  /** The microphone track sent to the camera, only on WebRTC streams. */
  public get microphoneTrack(): MediaStreamTrack | undefined {
    return this._webRtcPlayer?.microphoneTrack;
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
      const streamUrl = __DEMO__
        ? this.stateObj.attributes.entity_picture
        : this._connected
          ? computeMJPEGStreamUrl(this.stateObj)
          : this._posterUrl;
      if (!streamUrl) {
        return nothing;
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
  }

  private async _getPosterUrl(): Promise<void> {
    try {
      this._posterUrl = await fetchThumbnailUrlWithCache(
        this._thumbnailApi(this._api, this._connection),
        this.stateObj!.entity_id,
        this.clientWidth,
        this.clientHeight
      );
    } catch (_err: any) {
      // poster url is optional
      this._posterUrl = undefined;
    }
  }

  private _handleImageLoad() {
    fireEvent(this, "load");
  }

  private _handleHlsStreams(ev: HASSDomEvent<HASSDomEvents["streams"]>) {
    this._hlsStreams = ev.detail;
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
      return;
    }
    this._webRtcStreams = ev.detail;
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
    img {
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
    streams: {
      hasAudio: boolean;
      hasVideo: boolean;
      codecs?: string[];
    };
  }
}
