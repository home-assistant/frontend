import {
  css,
  type CSSResultGroup,
  html,
  LitElement,
  nothing,
  type PropertyValues,
} from "lit";
import { customElement, property, state } from "lit/decorators";
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

@customElement("ha-camera-stream")
export class HaCameraStream extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: CameraEntity;

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

  @state() private _streamType?: StreamType;

  @state() private _hlsStreams?: { hasAudio: boolean; hasVideo: boolean };

  @state() private _webRtcStreams?: { hasAudio: boolean; hasVideo: boolean };

  public willUpdate(changedProps: PropertyValues): void {
    if (
      changedProps.has("stateObj") &&
      !this._shouldRenderMJPEG &&
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
    if (__DEMO__ || this._shouldRenderMJPEG) {
      return html`<img
        .src=${__DEMO__
          ? this.stateObj.attributes.entity_picture!
          : this._connected
            ? computeMJPEGStreamUrl(this.stateObj)
            : ""}
        alt=${`Preview of the ${computeStateName(this.stateObj)} camera.`}
      />`;
    }
    return html`${this._streamType === STREAM_TYPE_HLS ||
    (!this._streamType &&
      this._capabilities?.frontend_stream_types.includes(STREAM_TYPE_HLS))
      ? html`<ha-hls-player
          autoplay
          playsinline
          .allowExoPlayer=${this.allowExoPlayer}
          .muted=${this.muted}
          .controls=${this.controls}
          .hass=${this.hass}
          .entityid=${this.stateObj.entity_id}
          .posterUrl=${this._posterUrl}
          @streams=${this._handleHlsStreams}
          class=${!this._streamType && this._webRtcStreams?.hasVideo
            ? "hidden"
            : ""}
        ></ha-hls-player>`
      : nothing}
    ${this._streamType === STREAM_TYPE_WEB_RTC ||
    (!this._streamType &&
      this._capabilities?.frontend_stream_types.includes(STREAM_TYPE_WEB_RTC))
      ? html`<ha-web-rtc-player
          autoplay
          playsinline
          .muted=${this.muted}
          .controls=${this.controls}
          .hass=${this.hass}
          .entityid=${this.stateObj.entity_id}
          .posterUrl=${this._posterUrl}
          @streams=${this._handleWebRtcStreams}
          class=${this._streamType !== STREAM_TYPE_WEB_RTC &&
          !this._webRtcStreams
            ? "hidden"
            : ""}
        ></ha-web-rtc-player>`
      : nothing}`;
  }

  private async _getCapabilities() {
    this._capabilities = undefined;
    this._hlsStreams = undefined;
    this._webRtcStreams = undefined;
    if (!supportsFeature(this.stateObj!, CAMERA_SUPPORT_STREAM)) {
      return;
    }
    this._capabilities = await fetchCameraCapabilities(
      this.hass!,
      this.stateObj!.entity_id
    );
    if (this._capabilities.frontend_stream_types.length === 1) {
      this._streamType = this._capabilities.frontend_stream_types[0];
    }
  }

  private get _shouldRenderMJPEG() {
    if (!supportsFeature(this.stateObj!, CAMERA_SUPPORT_STREAM)) {
      // Steaming is not supported by the camera so fallback to MJPEG stream
      return true;
    }
    if (
      this._capabilities &&
      (!this._capabilities.frontend_stream_types.includes(STREAM_TYPE_HLS) ||
        this._hlsStreams?.hasVideo === false) &&
      (!this._capabilities.frontend_stream_types.includes(
        STREAM_TYPE_WEB_RTC
      ) ||
        this._webRtcStreams?.hasVideo === false)
    ) {
      // No video in HLS stream and no video in WebRTC stream
      return true;
    }
    return false;
  }

  private async _getPosterUrl(): Promise<void> {
    try {
      this._posterUrl = await fetchThumbnailUrlWithCache(
        this.hass!,
        this.stateObj!.entity_id,
        this.clientWidth,
        this.clientHeight
      );
    } catch (err: any) {
      // poster url is optional
      this._posterUrl = undefined;
    }
  }

  private _handleHlsStreams(ev: CustomEvent) {
    this._hlsStreams = ev.detail;
    this._pickStreamType();
  }

  private _handleWebRtcStreams(ev: CustomEvent) {
    this._webRtcStreams = ev.detail;
    this._pickStreamType();
  }

  private _pickStreamType() {
    if (!this._hlsStreams || !this._webRtcStreams) {
      return;
    }
    if (
      this._hlsStreams.hasVideo &&
      this._hlsStreams.hasAudio &&
      !this._webRtcStreams.hasAudio
    ) {
      this._streamType = STREAM_TYPE_HLS;
    } else if (this._webRtcStreams.hasVideo) {
      this._streamType = STREAM_TYPE_WEB_RTC;
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      :host,
      img {
        display: block;
      }

      img {
        width: 100%;
      }

      .hidden {
        display: none;
      }
    `;
  }
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
