import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { computeStateName } from "../common/entity/compute_state_name";
import { supportsFeature } from "../common/entity/supports-feature";
import {
  CameraEntity,
  CAMERA_SUPPORT_STREAM,
  computeMJPEGStreamUrl,
  fetchStreamUrl,
  fetchThumbnailUrlWithCache,
  STREAM_TYPE_HLS,
  STREAM_TYPE_WEB_RTC,
} from "../data/camera";
import { HomeAssistant } from "../types";
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

  // We keep track if we should force MJPEG if there was a failure
  // to get the HLS stream url. This is reset if we change entities.
  @state() private _forceMJPEG?: string;

  @state() private _url?: string;

  @state() private _connected = false;

  public willUpdate(changedProps: PropertyValues): void {
    if (
      changedProps.has("stateObj") &&
      !this._shouldRenderMJPEG &&
      this.stateObj &&
      (changedProps.get("stateObj") as CameraEntity | undefined)?.entity_id !==
        this.stateObj.entity_id
    ) {
      this._getPosterUrl();
      if (this.stateObj!.attributes.frontend_stream_type === STREAM_TYPE_HLS) {
        this._forceMJPEG = undefined;
        this._url = undefined;
        this._getStreamUrl();
      }
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
        .alt=${`Preview of the ${computeStateName(this.stateObj)} camera.`}
      />`;
    }
    if (this.stateObj.attributes.frontend_stream_type === STREAM_TYPE_HLS) {
      return this._url
        ? html`<ha-hls-player
            autoplay
            playsinline
            .allowExoPlayer=${this.allowExoPlayer}
            .muted=${this.muted}
            .controls=${this.controls}
            .hass=${this.hass}
            .url=${this._url}
            .posterUrl=${this._posterUrl}
          ></ha-hls-player>`
        : nothing;
    }
    if (this.stateObj.attributes.frontend_stream_type === STREAM_TYPE_WEB_RTC) {
      return html`<ha-web-rtc-player
        autoplay
        playsinline
        .muted=${this.muted}
        .controls=${this.controls}
        .hass=${this.hass}
        .entityid=${this.stateObj.entity_id}
        .posterUrl=${this._posterUrl}
      ></ha-web-rtc-player>`;
    }
    return nothing;
  }

  private get _shouldRenderMJPEG() {
    if (this._forceMJPEG === this.stateObj!.entity_id) {
      // Fallback when unable to fetch stream url
      return true;
    }
    if (!supportsFeature(this.stateObj!, CAMERA_SUPPORT_STREAM)) {
      // Steaming is not supported by the camera so fallback to MJPEG stream
      return true;
    }
    if (
      this.stateObj!.attributes.frontend_stream_type === STREAM_TYPE_WEB_RTC
    ) {
      // Browser support required for WebRTC
      return typeof RTCPeerConnection === "undefined";
    }
    // Server side stream component required for HLS
    return !isComponentLoaded(this.hass!, "stream");
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

  private async _getStreamUrl(): Promise<void> {
    try {
      const { url } = await fetchStreamUrl(
        this.hass!,
        this.stateObj!.entity_id
      );

      this._url = url;
    } catch (err: any) {
      // Fails if we were unable to get a stream
      // eslint-disable-next-line
      console.error(err);

      this._forceMJPEG = this.stateObj!.entity_id;
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-camera-stream": HaCameraStream;
  }
}
