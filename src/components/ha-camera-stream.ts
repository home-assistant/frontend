import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { computeStateName } from "../common/entity/compute_state_name";
import { supportsFeature } from "../common/entity/supports-feature";
import {
  CAMERA_SUPPORT_STREAM,
  type CameraCapabilities,
  type CameraEntity,
  computeMJPEGStreamUrl,
  fetchCameraCapabilities,
  fetchThumbnailUrlWithCache,
  STREAM_TYPE_HLS,
  STREAM_TYPE_WEB_RTC,
  type StreamType,
} from "../data/camera";
import type { HomeAssistant } from "../types";
import "./ha-hls-player";
import "./ha-web-rtc-player";

const MJPEG_STREAM = "mjpeg";

interface Stream {
  type: StreamType | typeof MJPEG_STREAM;
  visible: boolean;
}

@customElement("ha-camera-stream")
export class HaCameraStream extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

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

  @state() private _hlsStreams?: { hasAudio: boolean; hasVideo: boolean };

  @state() private _webRtcStreams?: { hasAudio: boolean; hasVideo: boolean };

  public willUpdate(changedProps: PropertyValues): void {
    if (
      changedProps.has("stateObj") &&
      this.stateObj &&
      (changedProps.get("stateObj") as CameraEntity | undefined)?.entity_id !==
        this.stateObj.entity_id
    ) {
      this._getCapabilities();
      this._getPosterUrl();
    }
  }

  public connectedCallback() {
    super.connectedCallback();
    this._connected = true;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._connected = false;
  }

  protected render() {
    if (!this.stateObj) {
      return nothing;
    }
    const streams = this._streams(
      this._capabilities?.frontend_stream_types,
      this._hlsStreams,
      this._webRtcStreams
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
      return html`<img
        .src=${__DEMO__
          ? this.stateObj.attributes.entity_picture!
          : this._connected
            ? computeMJPEGStreamUrl(this.stateObj)
            : this._posterUrl || ""}
        style=${styleMap({
          aspectRatio: this.aspectRatio,
          objectFit: this.fitMode,
        })}
        alt=${`Preview of the ${computeStateName(this.stateObj)} camera.`}
      />`;
    }

    if (stream.type === STREAM_TYPE_HLS) {
      return html`<ha-hls-player
        autoplay
        playsinline
        .allowExoPlayer=${this.allowExoPlayer}
        .muted=${this.muted}
        .controls=${this.controls}
        .hass=${this.hass}
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
        .twowayaudio=${this._capabilities?.two_way_audio}
        .controls=${this.controls}
        .hass=${this.hass}
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
    if (!supportsFeature(this.stateObj!, CAMERA_SUPPORT_STREAM)) {
      this._capabilities = { frontend_stream_types: [], two_way_audio: false };
      return;
    }
    this._capabilities = await fetchCameraCapabilities(
      this.hass!,
      this.stateObj!.entity_id
    );
  }

  private async _getPosterUrl(): Promise<void> {
    try {
      this._posterUrl = await fetchThumbnailUrlWithCache(
        this.hass!,
        this.stateObj!.entity_id,
        this.clientWidth,
        this.clientHeight
      );
    } catch (_err: any) {
      // poster url is optional
      this._posterUrl = undefined;
    }
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
      webRtcStreams?: { hasAudio: boolean; hasVideo: boolean }
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
          !webRtcStreams.hasAudio
        ) {
          // webRTC stream is missing audio, use HLS
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
    streams: {
      hasAudio: boolean;
      hasVideo: boolean;
      codecs?: string[];
    };
  }
}
