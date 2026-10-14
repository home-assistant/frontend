import type { ContextType } from "@lit/context";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import { STATE_RUNNING } from "home-assistant-js-websocket";
import memoizeOne from "memoize-one";
import { consume } from "../common/decorators/consume";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import { supportsFeature } from "../common/entity/supports-feature";
import type { LocalizeFunc } from "../common/translations/localize";
import {
  CameraEntityFeature,
  type CameraCapabilities,
  type CameraEntity,
  computeMJPEGStreamUrl,
  fetchCameraCapabilities,
  fetchThumbnailUrlWithCache,
  STREAM_TYPE_HLS,
  STREAM_TYPE_WEB_RTC,
  type StreamType,
} from "../data/camera";
import {
  apiContext,
  configContext,
  connectionContext,
  formattersContext,
} from "../data/context";
import {
  resolveMediaSource,
  type ResolvedMediaSource,
} from "../data/media_source";
import "./ha-alert";
import "./ha-hls-player";
import "./ha-web-rtc-player";

const MJPEG_STREAM = "mjpeg";

interface Stream {
  type: StreamType | typeof MJPEG_STREAM;
  visible: boolean;
}

@customElement("ha-camera-stream")
export class HaCameraStream extends LitElement {
  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

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

  @state() private _recording?: ResolvedMediaSource;

  @state() private _recordingError?: string;

  private _recordingRequest = 0;

  @state() private _capabilities?: CameraCapabilities;

  @state() private _hlsStreams?: { hasAudio: boolean; hasVideo: boolean };

  @state() private _webRtcStreams?: { hasAudio: boolean; hasVideo: boolean };

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

    const recordingChanged =
      changedProps.has("stateObj") &&
      (changedProps.get("stateObj") as CameraEntity | undefined)?.attributes
        .recording_media_source !==
        this.stateObj?.attributes.recording_media_source;
    if (
      this._connected &&
      this._api &&
      (entityChanged ||
        recordingChanged ||
        backendStarted ||
        changedProps.has("_connected") ||
        changedProps.has("_api"))
    ) {
      this._getRecording();
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    this._connected = true;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._connected = false;
    this._recordingRequest++;
    this._recording = undefined;
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }
    if (this.stateObj.attributes.recording_media_source) {
      if (!this._connected) {
        return nothing;
      }
      if (this._recordingError) {
        return html`<ha-alert alert-type="error"
          >${this._recordingError}</ha-alert
        >`;
      }
      if (!this._recording || !this._connection) {
        return html`<progress
          aria-label=${this._localize("ui.common.loading")}
        ></progress>`;
      }
      return html`<video
        autoplay
        playsinline
        .src=${this._connection.hassUrl(this._recording.url)}
        .controls=${this.controls}
        .muted=${this.muted}
        poster=${ifDefined(this._posterUrl)}
        style=${styleMap({ aspectRatio: this.aspectRatio, objectFit: this.fitMode })}
        @loadeddata=${this._handleImageLoad}
        @error=${this._handleRecordingError}
      ></video>`;
    }
    const streams = this._streams(
      this._capabilities?.frontend_stream_types,
      this._hlsStreams,
      this._webRtcStreams,
      this.muted
    );
    return html`${repeat(
      streams,
      (stream) => stream.type + this.stateObj!.entity_id,
      (stream) => this._renderStream(stream)
    )}`;
  }

  private _renderStream(stream: Stream) {
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

  private async _getCapabilities() {
    this._capabilities = undefined;
    this._hlsStreams = undefined;
    this._webRtcStreams = undefined;
    if (!supportsFeature(this.stateObj!, CameraEntityFeature.STREAM)) {
      this._capabilities = { frontend_stream_types: [] };
      return;
    }
    this._capabilities = await fetchCameraCapabilities(
      this._api,
      this.stateObj!.entity_id
    );
  }

  private async _getRecording(): Promise<void> {
    const request = ++this._recordingRequest;
    const mediaId = this.stateObj?.attributes.recording_media_source;
    this._recording = undefined;
    this._recordingError = undefined;
    if (!mediaId) {
      return;
    }
    try {
      const recording = await resolveMediaSource(this._api, mediaId);
      if (request !== this._recordingRequest || !this._connected) {
        return;
      }
      if (!recording.mime_type.startsWith("video/")) {
        this._handleRecordingError();
        return;
      }
      this._recording = recording;
    } catch (err: unknown) {
      if (request === this._recordingRequest && this._connected) {
        this._recordingError =
          err && typeof err === "object" && "message" in err
            ? String(err.message)
            : this._localize(
                "ui.components.media-browser.media_browsing_error"
              );
      }
    }
  }

  private _handleRecordingError(): void {
    this._recordingError = this._localize(
      "ui.components.media-browser.media_not_supported"
    );
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

  private _handleHlsStreams(ev: CustomEvent) {
    this._hlsStreams = ev.detail;
  }

  private _handleWebRtcStreams(ev: CustomEvent) {
    this._webRtcStreams = ev.detail;
  }

  private _streams = memoizeOne(
    (
      supportedTypes?: StreamType[],
      hlsStreams?: { hasAudio: boolean; hasVideo: boolean },
      webRtcStreams?: { hasAudio: boolean; hasVideo: boolean },
      muted?: boolean
    ): Stream[] => {
      if (__DEMO__) {
        return [{ type: MJPEG_STREAM, visible: true }];
      }
      if (!supportedTypes) {
        return [];
      }
      if (supportedTypes.length === 0) {
        // doesn't support any stream type, fallback to mjpeg
        return [{ type: MJPEG_STREAM, visible: true }];
      }
      if (supportedTypes.length === 1) {
        // only 1 stream type, no need to choose
        if (
          (supportedTypes[0] === STREAM_TYPE_HLS &&
            hlsStreams?.hasVideo === false) ||
          (supportedTypes[0] === STREAM_TYPE_WEB_RTC &&
            webRtcStreams?.hasVideo === false)
        ) {
          // stream failed to load, fallback to mjpeg
          return [{ type: MJPEG_STREAM, visible: true }];
        }
        return [{ type: supportedTypes[0], visible: true }];
      }
      if (hlsStreams && webRtcStreams) {
        // fully loaded
        if (
          hlsStreams.hasVideo &&
          hlsStreams.hasAudio &&
          !webRtcStreams.hasAudio &&
          !muted
        ) {
          // webRTC stream is missing audio and audio is not muted, use HLS
          return [{ type: STREAM_TYPE_HLS, visible: true }];
        }
        if (webRtcStreams.hasVideo) {
          return [{ type: STREAM_TYPE_WEB_RTC, visible: true }];
        }
        // both streams failed to load, fallback to mjpeg
        return [{ type: MJPEG_STREAM, visible: true }];
      }

      if (hlsStreams?.hasVideo !== webRtcStreams?.hasVideo) {
        // one of the two streams is loaded, or errored
        // choose the one that has video or is still loading
        if (hlsStreams?.hasVideo) {
          return [
            { type: STREAM_TYPE_HLS, visible: true },
            { type: STREAM_TYPE_WEB_RTC, visible: false },
          ];
        }
        if (hlsStreams?.hasVideo === false) {
          return [{ type: STREAM_TYPE_WEB_RTC, visible: true }];
        }
        if (webRtcStreams?.hasVideo) {
          return [
            { type: STREAM_TYPE_WEB_RTC, visible: true },
            { type: STREAM_TYPE_HLS, visible: false },
          ];
        }
        if (webRtcStreams?.hasVideo === false) {
          return [{ type: STREAM_TYPE_HLS, visible: true }];
        }
      }

      return [
        { type: STREAM_TYPE_HLS, visible: true },
        { type: STREAM_TYPE_WEB_RTC, visible: false },
      ];
    }
  );

  static styles = css`
    :host,
    img,
    video {
      display: block;
    }

    img,
    video {
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
    streams: {
      hasAudio: boolean;
      hasVideo: boolean;
      codecs?: string[];
    };
  }
}
