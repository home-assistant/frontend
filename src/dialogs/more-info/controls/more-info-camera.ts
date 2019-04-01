import {
  property,
  PropertyValues,
  LitElement,
  TemplateResult,
  html,
  CSSResult,
  css,
} from "lit-element";

import computeStateName from "../../../common/entity/compute_state_name";
import { HomeAssistant, CameraEntity } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import {
  fetchStreamUrl,
  computeMJPEGStreamUrl,
  CAMERA_SUPPORT_STREAM,
  CameraPreferences,
  fetchCameraPrefs,
  updateCameraPrefs,
} from "../../../data/camera";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "@polymer/paper-checkbox/paper-checkbox";
// Not duplicate import, it's for typing
// tslint:disable-next-line
import { PaperCheckboxElement } from "@polymer/paper-checkbox/paper-checkbox";

type HLSModule = typeof import("hls.js");

class MoreInfoCamera extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public stateObj?: CameraEntity;
  @property() private _cameraPrefs?: CameraPreferences;
  private _hlsPolyfillInstance?: Hls;

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._teardownPlayback();
  }

  protected render(): TemplateResult | void {
    return html`
      <div id="root"></div>
      ${this._cameraPrefs
        ? html`
            <paper-checkbox
              .checked=${this._cameraPrefs.preload_stream}
              @change=${this._handleCheckboxChanged}
            >
              Preload stream
            </paper-checkbox>
          `
        : undefined}
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

    if (
      !this.hass!.config.components.includes("stream") ||
      !supportsFeature(this.stateObj, CAMERA_SUPPORT_STREAM)
    ) {
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
        // Fetch in background while we set up the video.
        this._fetchCameraPrefs();

        if (Hls.isSupported()) {
          this._renderHLSPolyfill(videoEl, Hls, url);
        } else {
          this._renderHLSNative(videoEl, url);
        }
        return;
      } catch (err) {
        // When an error happens, we will do nothing so we render mjpeg.
      }
    }

    this._renderMJPEG();
  }

  private get _videoRoot(): HTMLDivElement {
    return this.shadowRoot!.getElementById("root")! as HTMLDivElement;
  }

  private async _renderHLSNative(videoEl: HTMLVideoElement, url: string) {
    videoEl.src = url;
    this._videoRoot.appendChild(videoEl);
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
    this._videoRoot.appendChild(videoEl);
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
    this._videoRoot.appendChild(img);
  }

  private _teardownPlayback(): any {
    if (this._hlsPolyfillInstance) {
      this._hlsPolyfillInstance.destroy();
      this._hlsPolyfillInstance = undefined;
    }
    const root = this._videoRoot;
    while (root.lastChild) {
      root.removeChild(root.lastChild);
    }
    this.stateObj = undefined;
    this._cameraPrefs = undefined;
  }

  private async _fetchCameraPrefs() {
    this._cameraPrefs = await fetchCameraPrefs(
      this.hass!,
      this.stateObj!.entity_id
    );
  }

  private async _handleCheckboxChanged(ev) {
    const checkbox = ev.currentTarget as PaperCheckboxElement;
    try {
      this._cameraPrefs = await updateCameraPrefs(
        this.hass!,
        this.stateObj!.entity_id,
        {
          preload_stream: checkbox.checked!,
        }
      );
    } catch (err) {
      alert(err.message);
      checkbox.checked = !checkbox.checked;
    }
  }

  static get styles(): CSSResult {
    return css`
      paper-checkbox {
        position: absolute;
        top: 0;
        right: 0;
        background-color: var(--secondary-background-color);
        padding: 5px;
        border-bottom-left-radius: 6px;
      }
    `;
  }
}

customElements.define("more-info-camera", MoreInfoCamera);
