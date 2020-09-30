import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  query,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../common/dom/fire_event";
import { nextRender } from "../common/util/render-status";
import { getExternalConfig } from "../external_app/external_config";
import type { HomeAssistant } from "../types";

type HLSModule = typeof import("hls.js");

@customElement("ha-hls-player")
class HaHLSPlayer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public url!: string;

  @property({ type: Boolean, attribute: "controls" })
  public controls = false;

  @property({ type: Boolean, attribute: "muted" })
  public muted = false;

  @property({ type: Boolean, attribute: "autoplay" })
  public autoPlay = false;

  @property({ type: Boolean, attribute: "playsinline" })
  public playsInline = false;

  @property({ type: Boolean, attribute: "allow-exoplayer" })
  public allowExoPlayer = false;

  @query("video") private _videoEl!: HTMLVideoElement;

  @internalProperty() private _attached = false;

  private _hlsPolyfillInstance?: Hls;

  private _useExoPlayer = false;

  public connectedCallback() {
    super.connectedCallback();
    this._attached = true;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._attached = false;
  }

  protected render(): TemplateResult {
    if (!this._attached) {
      return html``;
    }

    return html`
      <video
        ?autoplay=${this.autoPlay}
        .muted=${this.muted}
        ?playsinline=${this.playsInline}
        ?controls=${this.controls}
        @loadeddata=${this._elementResized}
      ></video>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    const attachedChanged = changedProps.has("_attached");
    const urlChanged = changedProps.has("url");

    if (!urlChanged && !attachedChanged) {
      return;
    }

    // If we are no longer attached, destroy polyfill
    if (attachedChanged && !this._attached) {
      // Tear down existing polyfill, if available
      this._destroyPolyfill();
      return;
    }

    this._destroyPolyfill();
    this._startHls();
  }

  private async _getUseExoPlayer(): Promise<boolean> {
    if (!this.hass!.auth.external || !this.allowExoPlayer) {
      return false;
    }
    const externalConfig = await getExternalConfig(this.hass!.auth.external);
    return externalConfig && externalConfig.hasExoPlayer;
  }

  private async _startHls(): Promise<void> {
    const videoEl = this._videoEl;
    const playlist_url = this.url.replace("master_playlist", "playlist");
    const useExoPlayerPromise = this._getUseExoPlayer();
    const masterPlaylistPromise = fetch(this.url);

    const hls = ((await import(
      /* webpackChunkName: "hls.js" */ "hls.js"
    )) as any).default as HLSModule;
    let hlsSupported = hls.isSupported();

    if (!hlsSupported) {
      hlsSupported =
        videoEl.canPlayType("application/vnd.apple.mpegurl") !== "";
    }

    if (!hlsSupported) {
      this._videoEl.innerHTML = this.hass.localize(
        "ui.components.media-browser.video_not_supported"
      );
      return;
    }

    this._useExoPlayer = await useExoPlayerPromise;
    let hevcRegexp: RegExp;
    let masterPlaylist: string;
    if (this._useExoPlayer) {
      hevcRegexp = /CODECS=".*?((hev1)|(hvc1))\..*?"/;
      masterPlaylist = await (await masterPlaylistPromise).text();
    }
    if (this._useExoPlayer && hevcRegexp!.test(masterPlaylist!)) {
      this._renderHLSExoPlayer(playlist_url);
    } else if (hls.isSupported()) {
      this._renderHLSPolyfill(videoEl, hls, playlist_url);
    } else {
      this._renderHLSNative(videoEl, playlist_url);
    }
  }

  private async _renderHLSExoPlayer(url: string) {
    window.addEventListener("resize", this._resizeExoPlayer);
    this.updateComplete.then(() => nextRender()).then(this._resizeExoPlayer);
    this._videoEl.style.visibility = "hidden";
    await this.hass!.auth.external!.sendMessage({
      type: "exoplayer/play_hls",
      payload: {
        url: new URL(url, window.location.href).toString(),
        muted: this.muted,
      },
    });
  }

  private _resizeExoPlayer = () => {
    const rect = this._videoEl.getBoundingClientRect();
    this.hass!.auth.external!.fireMessage({
      type: "exoplayer/resize",
      payload: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      },
    });
  };

  private async _renderHLSPolyfill(
    videoEl: HTMLVideoElement,
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

  private async _renderHLSNative(videoEl: HTMLVideoElement, url: string) {
    videoEl.src = url;
    await new Promise((resolve) =>
      videoEl.addEventListener("loadedmetadata", resolve)
    );
    videoEl.play();
  }

  private _elementResized() {
    fireEvent(this, "iron-resize");
  }

  private _destroyPolyfill() {
    if (this._hlsPolyfillInstance) {
      this._hlsPolyfillInstance.destroy();
      this._hlsPolyfillInstance = undefined;
    }
    if (this._useExoPlayer) {
      window.removeEventListener("resize", this._resizeExoPlayer);
      this.hass!.auth.external!.fireMessage({ type: "exoplayer/stop" });
    }
  }

  static get styles(): CSSResult {
    return css`
      :host,
      video {
        display: block;
      }

      video {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-hls-player": HaHLSPlayer;
  }
}
