import * as URLToolkit from 'url-toolkit';

import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
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

declare global {
  interface Window {
    androidExoPlayer?: {
      playHLS(url: string);
      stopHLS();
      resize(left:number,top:number,width:number,height:number);
    };
  }
}

@customElement("ha-camera-stream")
class HaCameraStream extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public stateObj?: CameraEntity;

  @property({ type: Boolean }) public showControls = false;

  @internalProperty() private _attached = false;

  // We keep track if we should force MJPEG with a string
  // that way it automatically resets if we change entity.
  @internalProperty() private _forceMJPEG: string | undefined = undefined;

  private _hlsPolyfillInstance?: Hls;

  private _useExoPlayer(): boolean {return typeof(window.androidExoPlayer) !== 'undefined';}
  
  private _resizeExoPlayerListener;

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
    var hls;
    const videoEl = this._videoEl;
    if (!this._useExoPlayer()) {
      hls = ((await import(
        /* webpackChunkName: "hls.js" */ "hls.js"
      )) as any).default as HLSModule;
      let hlsSupported = hls.isSupported();

      if (!hlsSupported) {
        hlsSupported =
          videoEl.canPlayType("application/vnd.apple.mpegurl") !== "";
      }

      if (!hlsSupported) {
        this._forceMJPEG = this.stateObj!.entity_id;
        return;
      }
    }

    try {
      const { url } = await fetchStreamUrl(
        this.hass!,
        this.stateObj!.entity_id
      );

      if (this._useExoPlayer()){
        this._renderHLSExoPlayer(url);
      } else if (hls.isSupported()) {
        this._renderHLSPolyfill(videoEl, hls, url);
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

  private async _renderHLSExoPlayer(url: string) {
    this._resizeExoPlayerListener=() => this._resizeExoPlayer();
    window.addEventListener('resize', this._resizeExoPlayerListener);
    this._resizeExoPlayer();
    this._videoEl.style.visibility = "hidden";
    window.androidExoPlayer!.playHLS(URLToolkit.buildAbsoluteURL(window.location.href, url, {alwaysNormalize: true}));
  }

  private _resizeExoPlayer(){
    const rect = this._videoEl.getBoundingClientRect();
    window.androidExoPlayer!.resize(rect.left,rect.top,rect.right,rect.bottom)
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
      fragLoadingTimeOut: 30000,
      manifestLoadingTimeOut: 30000,
      levelLoadingTimeOut: 30000,
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
    if (this._useExoPlayer()) {
      window.removeEventListener('resize',this._resizeExoPlayerListener)
      window.androidExoPlayer?.stopHLS()
      this._videoEl.style.visibility = "hidden";
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
