import { property, UpdatingElement, PropertyValues } from "lit-element";

import computeStateName from "../../../common/entity/compute_state_name";
import { HomeAssistant, CameraEntity } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { fetchStreamUrl, computeMJPEGStreamUrl } from "../../../data/camera";

type HLSModule = typeof import("hls.js");

class MoreInfoCamera extends UpdatingElement {
  @property() public hass?: HomeAssistant;
  @property() public stateObj?: CameraEntity;
  private _hlsPolyfillInstance?: Hls;

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._teardownPlayback();
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

    if (!this.hass!.config.components.includes("stream")) {
      this._renderMJPEG();
      return;
    }

    const videoEl = document.createElement("video");
    videoEl.style.width = "100%";
    videoEl.autoplay = true;
    videoEl.controls = true;
    videoEl.muted = true;

    // tslint:disable-next-line
    const Hls = ((await import(/* webpackChunkName: "hls.js" */ "hls.js")) as any)
      .default as HLSModule;
    let hlsSupported = Hls.isSupported();

    if (!hlsSupported) {
      hlsSupported =
        videoEl.canPlayType("application/vnd.apple.mpegurl") !== "";
    }

    if (hlsSupported) {
      try {
        const { url } = await fetchStreamUrl(
          this.hass!,
          this.stateObj.entity_id
        );

        if (Hls.isSupported()) {
          this._renderHLSPolyfill(videoEl, Hls, url);
        } else {
          this._renderHLSNative(videoEl, url);
        }
        return;
      } catch (err) {
        // Fails if entity doesn't support it. In that case we go
        // for mjpeg.
      }
    }

    this._renderMJPEG();
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
    // tslint:disable-next-line
    Hls: HLSModule,
    url: string
  ) {
    const hls = new Hls();
    this._hlsPolyfillInstance = hls;
    await new Promise((resolve) => {
      hls.on(Hls.Events.MEDIA_ATTACHED, resolve);
      hls.attachMedia(videoEl);
    });
    hls.loadSource(url);
    this.appendChild(videoEl);
    videoEl.addEventListener("loadeddata", () =>
      fireEvent(this, "iron-resize")
    );
  }

  private _renderMJPEG() {
    const img = document.createElement("img");
    img.style.width = "100%";
    img.addEventListener("load", () => fireEvent(this, "iron-resize"));
    img.src = __DEMO__
      ? "/demo/webcamp.jpg"
      : computeMJPEGStreamUrl(this.stateObj!);
    img.alt = computeStateName(this.stateObj!);
    this.appendChild(img);
  }

  private _teardownPlayback(): any {
    if (this._hlsPolyfillInstance) {
      this._hlsPolyfillInstance.destroy();
      this._hlsPolyfillInstance = undefined;
    }
    while (this.lastChild) {
      this.removeChild(this.lastChild);
    }
    this.stateObj = undefined;
  }
}

customElements.define("more-info-camera", MoreInfoCamera);
