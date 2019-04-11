import {
  css,
  CSSResult,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";

import { HomeAssistant, CameraEntity } from "../types";
import { fireEvent } from "../common/dom/fire_event";
import { fetchStreamUrl } from "../data/camera";

type HLSModule = typeof import("hls.js");

class HaCameraStream extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public stateObj?: CameraEntity;
  private _hlsPolyfillInstance?: Hls;

  protected render(): TemplateResult | void {
    return html`
      <video autoplay controls muted playsinline></video>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    if (!changedProps.has("stateObj")) {
      return;
    }

    const oldState = changedProps.get("stateObj") as this["stateObj"];
    const oldEntityId = oldState ? oldState.entity_id : undefined;
    const curEntityId = this.stateObj ? this.stateObj.entity_id : undefined;

    // Same entity, ignore.
    if (curEntityId === oldEntityId) {
      return;
    }

    // Tear down if we have something and we need to build it up
    if (oldEntityId) {
      this._teardownPlayback();
    }

    if (curEntityId) {
      this._startPlayback();
    }
  }

  private async _startPlayback(): Promise<void> {
    if (!this.stateObj) {
      return;
    }

    // tslint:disable-next-line
    const Hls = ((await import(/* webpackChunkName: "hls.js" */ "hls.js")) as any)
      .default as HLSModule;
    let hlsSupported = Hls.isSupported();

    if (!hlsSupported) {
      hlsSupported =
        this._videoEl.canPlayType("application/vnd.apple.mpegurl") !== "";
    }

    if (hlsSupported) {
      try {
        const { url } = await fetchStreamUrl(
          this.hass!,
          this.stateObj.entity_id
        );

        if (Hls.isSupported()) {
          this._renderHLSPolyfill(Hls, url);
        } else {
          this._renderHLSNative(url);
        }
        return;
      } catch (err) {
        // When an error happens, we will do nothing so we render mjpeg.
        // TODO: Actually do something
      }
    }
  }

  private get _videoEl(): HTMLVideoElement {
    return this.shadowRoot!.querySelector("video")! as HTMLVideoElement;
  }

  private async _renderHLSNative(url: string) {
    const videoEl = this._videoEl;
    videoEl.src = url;
    await new Promise((resolve) =>
      videoEl.addEventListener("loadedmetadata", resolve)
    );
    videoEl.play();
  }

  private async _renderHLSPolyfill(
    // tslint:disable-next-line
    Hls: HLSModule,
    url: string
  ) {
    const hls = new Hls();
    const videoEl = this._videoEl;
    this._hlsPolyfillInstance = hls;
    await new Promise((resolve) => {
      hls.on(Hls.Events.MEDIA_ATTACHED, resolve);
      hls.attachMedia(videoEl);
    });
    hls.loadSource(url);
    videoEl.addEventListener("loadeddata", () =>
      fireEvent(this, "iron-resize")
    );
  }

  private _teardownPlayback(): any {
    if (this._hlsPolyfillInstance) {
      this._hlsPolyfillInstance.destroy();
      this._hlsPolyfillInstance = undefined;
    } else {
      this._videoEl.src = "";
    }
    this.stateObj = undefined;
  }

  static get styles(): CSSResult {
    return css`
      video {
        width: 100%;
      }
    `;
  }
}

customElements.define("ha-camera-stream", HaCameraStream);
