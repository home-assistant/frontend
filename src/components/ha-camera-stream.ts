import {
  css,
  CSSResult,
  customElement,
  html,
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

type HLSModule = typeof import("hls.js");

@customElement("ha-camera-stream")
class HaCameraStream extends LitElement {
  @property() public hass?: HomeAssistant;

  @property() public stateObj?: CameraEntity;

  @property({ type: Boolean }) public showControls = false;

  @property() private _attached = false;

  // We keep track if we should force MJPEG with a string
  // that way it automatically resets if we change entity.
  @property() private _forceMJPEG: string | undefined = undefined;

  private _hlsPolyfillInstance?: Hls;

  public connectedCallback() {
    super.connectedCallback();
    this._attached = true;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._attached = false;
  }

  protected render(): TemplateResult {
    if (!this.stateObj || !this._attached) {
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
        : html`
            <video
              autoplay
              muted
              playsinline
              ?controls=${this.showControls}
              @loadeddata=${this._elementResized}
            ></video>
          `}
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    const stateObjChanged = changedProps.has("stateObj");
    const attachedChanged = changedProps.has("_attached");

    const oldState = changedProps.get("stateObj") as this["stateObj"];
    const oldEntityId = oldState ? oldState.entity_id : undefined;
    const curEntityId = this.stateObj ? this.stateObj.entity_id : undefined;

    if (
      (!stateObjChanged && !attachedChanged) ||
      (stateObjChanged && oldEntityId === curEntityId)
    ) {
      return;
    }

    // If we are no longer attached, destroy polyfill.
    if (attachedChanged && !this._attached) {
      this._destroyPolyfill();
      return;
    }

    // Nothing to do if we are render MJPEG.
    if (this._shouldRenderMJPEG) {
      return;
    }

    // Tear down existing polyfill, if available
    this._destroyPolyfill();

    if (curEntityId) {
      this._startHls();
    }
  }

  private get _shouldRenderMJPEG() {
    return (
      this._forceMJPEG === this.stateObj!.entity_id ||
      !this.hass!.config.components.includes("stream") ||
      !supportsFeature(this.stateObj!, CAMERA_SUPPORT_STREAM)
    );
  }

  private get _videoEl(): HTMLVideoElement {
    return this.shadowRoot!.querySelector("video")!;
  }

  private async _startHls(): Promise<void> {
    // eslint-disable-next-line
    const Hls = ((await import(
      /* webpackChunkName: "hls.js" */ "hls.js"
    )) as any).default as HLSModule;
    let hlsSupported = Hls.isSupported();
    const videoEl = this._videoEl;

    if (!hlsSupported) {
      hlsSupported =
        videoEl.canPlayType("application/vnd.apple.mpegurl") !== "";
    }

    if (!hlsSupported) {
      this._forceMJPEG = this.stateObj!.entity_id;
      return;
    }

    try {
      const { url } = await fetchStreamUrl(
        this.hass!,
        this.stateObj!.entity_id
      );

      if (Hls.isSupported()) {
        this._renderHLSPolyfill(videoEl, Hls, url);
      } else {
        this._renderHLSNative(videoEl, url);
      }
      return;
    } catch (err) {
      // Fails if we were unable to get a stream
      // eslint-disable-next-line
      console.error(err);
      this._forceMJPEG = this.stateObj!.entity_id;
    }
  }

  private async _renderHLSNative(videoEl: HTMLVideoElement, url: string) {
    videoEl.src = url;
    await new Promise((resolve) =>
      videoEl.addEventListener("loadedmetadata", resolve)
    );
    videoEl.play();
  }

  private async _renderHLSPolyfill(
    videoEl: HTMLVideoElement,
    // eslint-disable-next-line
    Hls: HLSModule,
    url: string
  ) {
    const hls = new Hls({
      liveBackBufferLength: 60,
    });
    this._hlsPolyfillInstance = hls;
    hls.attachMedia(videoEl);
    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      hls.loadSource(url);
    });
  }

  private _elementResized() {
    fireEvent(this, "iron-resize");
  }

  private _destroyPolyfill(): void {
    if (this._hlsPolyfillInstance) {
      this._hlsPolyfillInstance.destroy();
      this._hlsPolyfillInstance = undefined;
    }
  }

  static get styles(): CSSResult {
    return css`
      :host,
      img,
      video {
        display: block;
      }

      img,
      video {
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
