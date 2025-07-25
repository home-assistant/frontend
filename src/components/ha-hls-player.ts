import type HlsType from "hls.js";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { fireEvent } from "../common/dom/fire_event";
import { nextRender } from "../common/util/render-status";
import { fetchStreamUrl } from "../data/camera";
import type { HomeAssistant } from "../types";
import "./ha-alert";

type HlsLite = Omit<
  HlsType,
  "subtitleTrackController" | "audioTrackController" | "emeController"
>;

@customElement("ha-hls-player")
class HaHLSPlayer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityid?: string;

  @property() public url?: string;

  @property({ attribute: "poster-url" }) public posterUrl?: string;

  @property({ attribute: false }) public aspectRatio?: number;

  @property({ attribute: false }) public fitMode?: "cover" | "contain" | "fill";

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

  // don't cache this, as we remove it on disconnects
  @query("video") private _videoEl!: HTMLVideoElement;

  @state() private _error?: string;

  @state() private _errorIsFatal = false;

  @state() private _url!: string;

  private _hlsPolyfillInstance?: HlsLite;

  private _exoPlayer = false;

  private static streamCount = 0;

  private _handleVisibilityChange = () => {
    if (document.hidden) {
      this._cleanUp();
    } else {
      this._resetError();
      this._startHls();
    }
  };

  public connectedCallback() {
    super.connectedCallback();
    HaHLSPlayer.streamCount += 1;
    if (this.hasUpdated) {
      this._resetError();
      this._startHls();
    }
    document.addEventListener("visibilitychange", this._handleVisibilityChange);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(
      "visibilitychange",
      this._handleVisibilityChange
    );
    HaHLSPlayer.streamCount -= 1;
    this._cleanUp();
  }

  protected render(): TemplateResult {
    return html`
      ${this._error
        ? html`<ha-alert
            alert-type="error"
            class=${this._errorIsFatal ? "fatal" : "retry"}
          >
            ${this._error}
          </ha-alert>`
        : ""}
      ${!this._errorIsFatal
        ? html`<video
            .poster=${this.posterUrl}
            ?autoplay=${this.autoPlay}
            .muted=${this.muted}
            ?playsinline=${this.playsInline}
            ?controls=${this.controls}
            @loadeddata=${this._loadedData}
            style=${styleMap({
              height: this.aspectRatio == null ? "100%" : "auto",
              aspectRatio: this.aspectRatio,
              objectFit: this.fitMode,
            })}
          ></video>`
        : ""}
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    const entityChanged = changedProps.has("entityid");
    const urlChanged = changedProps.has("url");

    if (entityChanged) {
      this._getStreamUrlFromEntityId();
    } else if (urlChanged && this.url) {
      this._cleanUp();
      this._resetError();
      this._url = this.url;
      this._startHls();
    }
  }

  private async _getStreamUrlFromEntityId(): Promise<void> {
    this._cleanUp();
    this._resetError();

    if (!isComponentLoaded(this.hass!, "stream")) {
      this._setFatalError("Streaming component is not loaded.");
      return;
    }

    if (!this.entityid) {
      return;
    }
    try {
      const { url } = await fetchStreamUrl(this.hass!, this.entityid);

      this._url = this.hass.hassUrl(url);
      this._cleanUp();
      this._resetError();
      this._startHls();
    } catch (err: any) {
      // Fails if we were unable to get a stream
      // eslint-disable-next-line
      console.error(err);

      fireEvent(this, "streams", { hasAudio: false, hasVideo: false });
    }
  }

  private async _startHls(): Promise<void> {
    const masterPlaylistPromise = fetch(this._url);

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const Hls: typeof HlsType = (await import("hls.js/dist/hls.light.mjs"))
      .default;

    if (!this.isConnected) {
      return;
    }

    let hlsSupported = Hls.isSupported();

    if (!hlsSupported) {
      hlsSupported =
        this._videoEl.canPlayType("application/vnd.apple.mpegurl") !== "";
    }

    if (!hlsSupported) {
      this._setFatalError(
        this.hass.localize("ui.components.media-browser.video_not_supported")
      );
      return;
    }

    const useExoPlayer =
      this.allowExoPlayer && this.hass.auth.external?.config.hasExoPlayer;
    const masterPlaylist = await (await masterPlaylistPromise).text();

    if (!this.isConnected) {
      return;
    }

    // Parse playlist assuming it is a master playlist. Match group 1 and 2 are codec, match group 3 is regular playlist url
    // See https://tools.ietf.org/html/rfc8216 for HLS spec details
    const playlistRegexp =
      /#EXT-X-STREAM-INF:.*?(?:CODECS=".*?([^.]*)?\..*?,([^.]*)?\..*?".*?)?(?:\n|\r\n)(.+)/g;
    const match = playlistRegexp.exec(masterPlaylist);
    const matchTwice = playlistRegexp.exec(masterPlaylist);

    // Get the regular playlist url from the input (master) playlist, falling back to the input playlist if necessary
    // This avoids the player having to load and parse the master playlist again before loading the regular playlist
    let playlist_url: string;
    if (match !== null && matchTwice === null) {
      // Only send the regular playlist url if we match exactly once
      playlist_url = new URL(match[3], this._url).href;
    } else {
      playlist_url = this._url;
    }

    const codecs = match ? `${match[1]},${match[2]}` : undefined;

    this._reportStreams(codecs);

    // If codec is HEVC and ExoPlayer is supported, use ExoPlayer.
    if (
      useExoPlayer &&
      (codecs?.includes("hevc") || codecs?.includes("hev1"))
    ) {
      this._renderHLSExoPlayer(playlist_url);
    } else if (Hls.isSupported()) {
      this._renderHLSPolyfill(this._videoEl, Hls, playlist_url);
    } else {
      this._renderHLSNative(this._videoEl, playlist_url);
    }
  }

  private async _renderHLSExoPlayer(url: string) {
    this._exoPlayer = true;
    window.addEventListener("resize", this._resizeExoPlayer);
    this.updateComplete.then(() => nextRender()).then(this._resizeExoPlayer);
    this._videoEl.style.visibility = "hidden";
    await this.hass!.auth.external!.fireMessage({
      type: "exoplayer/play_hls",
      payload: {
        url,
        muted: this.muted,
      },
    });
  }

  private _resizeExoPlayer = () => {
    if (!this._videoEl) {
      return;
    }
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

  private _isLLHLSSupported(): boolean {
    // LL-HLS keeps multiple requests in flight, which can run into browser limitations without
    // an http/2 proxy to pipeline requests. However, a small number of streams active at
    // once should be OK.
    // The stream count may be incremented multiple times before this function is called to check
    // the count e.g. when loading a page with many streams on it. The race can work in our favor
    // so we now have a better idea on if we'll use too many browser connections later.
    if (HaHLSPlayer.streamCount <= 2) {
      return true;
    }
    if (
      !("performance" in window) ||
      performance.getEntriesByType("resource").length === 0
    ) {
      return false;
    }
    const perfEntry = performance.getEntriesByType(
      "resource"
    )[0] as PerformanceResourceTiming;
    return "nextHopProtocol" in perfEntry && perfEntry.nextHopProtocol === "h2";
  }

  private async _renderHLSPolyfill(
    videoEl: HTMLVideoElement,
    Hls: typeof HlsType,
    url: string
  ) {
    const hls = new Hls({
      backBufferLength: 60,
      fragLoadingTimeOut: 30000,
      manifestLoadingTimeOut: 30000,
      levelLoadingTimeOut: 30000,
      maxLiveSyncPlaybackRate: 2,
      lowLatencyMode: this._isLLHLSSupported(),
    });
    this._hlsPolyfillInstance = hls;
    hls.attachMedia(videoEl);
    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      this._resetError();
      hls.loadSource(url);
    });
    hls.on(Hls.Events.FRAG_LOADED, (_event, _data: any) => {
      this._resetError();
    });
    hls.on(Hls.Events.ERROR, (_event, data: any) => {
      // Some errors are recovered automatically by the hls player itself, and the others handled
      // in this function require special actions to recover. Errors retried in this function
      // are done with backoff to not cause unnecessary failures.
      if (!data.fatal) {
        return;
      }
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        switch (data.details) {
          case Hls.ErrorDetails.MANIFEST_LOAD_ERROR: {
            let error = "Error starting stream, see logs for details";
            if (
              data.response !== undefined &&
              data.response.code !== undefined
            ) {
              if (data.response.code >= 500) {
                error += " (Server failure)";
              } else if (data.response.code >= 400) {
                error += " (Stream never started)";
              } else {
                error += " (" + data.response.code + ")";
              }
            }
            this._setRetryableError(error);
            break;
          }
          case Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT:
            this._setRetryableError("Timeout while starting stream");
            break;
          default:
            this._setRetryableError("Stream network error");
            break;
        }
        hls.startLoad();
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        this._setRetryableError("Error with media stream contents");
        hls.recoverMediaError();
      } else {
        this._setFatalError("Error playing stream");
      }
    });
  }

  private async _renderHLSNative(videoEl: HTMLVideoElement, url: string) {
    videoEl.src = url;
    videoEl.addEventListener("loadedmetadata", () => {
      videoEl.play();
    });
  }

  private _cleanUp() {
    if (this._hlsPolyfillInstance) {
      this._hlsPolyfillInstance.destroy();
      this._hlsPolyfillInstance = undefined;
    }
    if (this._exoPlayer) {
      window.removeEventListener("resize", this._resizeExoPlayer);
      this.hass!.auth.external!.fireMessage({ type: "exoplayer/stop" });
      this._exoPlayer = false;
    }
    if (this._videoEl) {
      this._videoEl.removeAttribute("src");
      this._videoEl.load();
    }
  }

  private _resetError() {
    this._error = undefined;
    this._errorIsFatal = false;
  }

  private _setFatalError(errorMessage: string) {
    this._error = errorMessage;
    this._errorIsFatal = true;
    fireEvent(this, "streams", { hasAudio: false, hasVideo: false });
  }

  private _setRetryableError(errorMessage: string) {
    this._error = errorMessage;
    this._errorIsFatal = false;
    fireEvent(this, "streams", { hasAudio: false, hasVideo: false });
  }

  private _reportStreams(codecs?: string) {
    const codec = codecs?.split(",");
    fireEvent(this, "streams", {
      hasAudio: codec?.includes("mp4a") ?? false,
      hasVideo: codec?.includes("mp4a")
        ? codec?.length > 1
        : Boolean(codec?.length),
    });
  }

  private _loadedData() {
    fireEvent(this, "load");
  }

  static styles = css`
    :host,
    video {
      display: block;
    }

    video {
      width: 100%;
      max-height: var(--video-max-height, calc(100vh - 97px));
    }

    .fatal {
      display: block;
      padding: 100px 16px;
    }

    .retry {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-hls-player": HaHLSPlayer;
  }
}
