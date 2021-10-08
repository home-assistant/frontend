import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
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
  STREAM_TYPE_HLS,
  STREAM_TYPE_WEB_RTC,
} from "../data/camera";
import { HomeAssistant } from "../types";
import "./ha-hls-player";
import "./ha-web-rtc-player";

@customElement("ha-camera-stream")
class HaCameraStream extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: CameraEntity;

  @property({ type: Boolean, attribute: "controls" })
  public controls = false;

  @property({ type: Boolean, attribute: "muted" })
  public muted = false;

  @property({ type: Boolean, attribute: "allow-exoplayer" })
  public allowExoPlayer = false;

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
        this.stateObj.entity_id &&
      this.stateObj!.attributes.stream_type === STREAM_TYPE_HLS
    ) {
      this._forceMJPEG = undefined;
      this._url = undefined;
      this._getStreamUrl();
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

  protected render(): TemplateResult {
    if (!this.stateObj) {
      return html``;
    }
    if (
      supportsFeature(this.stateObj, CAMERA_SUPPORT_STREAM) &&
      this.stateObj.attributes.stream_type === STREAM_TYPE_WEB_RTC
    ) {
      if (typeof RTCPeerConnection === "undefined") {
        return html`<ha-alert alert-type="error"
          >${this.hass.localize(
            "ui.components.media-browser.video_not_supported"
          )}</ha-alert
        >`;
      }
      return html` <ha-web-rtc-player
        autoplay
        playsinline
        .muted=${this.muted}
        .controls=${this.controls}
        .hass=${this.hass}
        .entityid=${this.stateObj.entity_id}
      ></ha-web-rtc-player>`;
    }
    return html`
      ${__DEMO__ || this._shouldRenderMJPEG
        ? html`
            <img
              .src=${__DEMO__
                ? this.stateObj.attributes.entity_picture!
                : this._connected
                ? computeMJPEGStreamUrl(this.stateObj)
                : ""}
              .alt=${`Preview of the ${computeStateName(
                this.stateObj
              )} camera.`}
            />
          `
        : this._url
        ? html`
            <ha-hls-player
              autoplay
              playsinline
              .allowExoPlayer=${this.allowExoPlayer}
              .muted=${this.muted}
              .controls=${this.controls}
              .hass=${this.hass}
              .url=${this._url}
            ></ha-hls-player>
          `
        : ""}
    `;
  }

  private get _shouldRenderMJPEG() {
    return (
      this._forceMJPEG === this.stateObj!.entity_id ||
      !isComponentLoaded(this.hass!, "stream") ||
      !supportsFeature(this.stateObj!, CAMERA_SUPPORT_STREAM)
    );
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
