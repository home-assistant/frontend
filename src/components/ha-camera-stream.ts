import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../common/dom/fire_event";
import { computeStateName } from "../common/entity/compute_state_name";
import { supportsFeature } from "../common/entity/supports-feature";
import {
  CAMERA_SUPPORT_STREAM,
  computeMJPEGStreamUrl,
  fetchStreamUrl,
} from "../data/camera";
import { CameraEntity, HomeAssistant } from "../types";
import "./ha-hls-player";

@customElement("ha-camera-stream")
class HaCameraStream extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: CameraEntity;

  @property({ type: Boolean, attribute: "controls" })
  public controls = false;

  @property({ type: Boolean, attribute: "muted" })
  public muted = false;

  // We keep track if we should force MJPEG with a string
  // that way it automatically resets if we change entity.
  @internalProperty() private _forceMJPEG?: string;

  @internalProperty() private _url?: string;

  protected render(): TemplateResult {
    if (!this.stateObj) {
      return html``;
    }

    return html`
      ${__DEMO__ || this._shouldRenderMJPEG
        ? html`
            <img
              @load=${this._elementResized}
              .src=${__DEMO__
                ? this.stateObj!.attributes.entity_picture
                : computeMJPEGStreamUrl(this.stateObj)}
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
              .muted=${this.muted}
              .controls=${this.controls}
              .hass=${this.hass}
              .url=${this._url}
            ></ha-hls-player>
          `
        : ""}
    `;
  }

  protected updated(changedProps: PropertyValues): void {
    if (changedProps.has("stateObj") && !this._shouldRenderMJPEG) {
      this._forceMJPEG = undefined;
      this._getStreamUrl();
    }
  }

  private get _shouldRenderMJPEG() {
    return (
      this._forceMJPEG === this.stateObj!.entity_id ||
      !this.hass!.config.components.includes("stream") ||
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
    } catch (err) {
      // Fails if we were unable to get a stream
      // eslint-disable-next-line
      console.error(err);

      this._forceMJPEG = this.stateObj!.entity_id;
    }
  }

  private _elementResized() {
    fireEvent(this, "iron-resize");
  }

  static get styles(): CSSResult {
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
