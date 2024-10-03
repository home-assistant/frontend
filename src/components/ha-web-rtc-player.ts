/* eslint-disable no-console */
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { fireEvent } from "../common/dom/fire_event";
import {
  fetchWebRtcClientConfiguration,
  handleWebRtcOffer,
  WebRtcAnswer,
} from "../data/camera";
import type { HomeAssistant } from "../types";
import "./ha-alert";

/**
 * A WebRTC stream is established by first sending an offer through a signal
 * path via an integration. An answer is returned, then the rest of the stream
 * is handled entirely client side.
 */
@customElement("ha-web-rtc-player")
class HaWebRtcPlayer extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public entityid!: string;

  @property({ type: Boolean, attribute: "controls" })
  public controls = false;

  @property({ type: Boolean, attribute: "muted" })
  public muted = false;

  @property({ type: Boolean, attribute: "autoplay" })
  public autoPlay = false;

  @property({ type: Boolean, attribute: "playsinline" })
  public playsInline = false;

  @property({ attribute: "poster-url" }) public posterUrl?: string;

  @state() private _error?: string;

  // don't cache this, as we remove it on disconnects
  @query("#remote-stream") private _videoEl!: HTMLVideoElement;

  private _peerConnection?: RTCPeerConnection;

  private _remoteStream?: MediaStream;

  protected override render(): TemplateResult {
    if (this._error) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }
    return html`
      <video
        id="remote-stream"
        ?autoplay=${this.autoPlay}
        .muted=${this.muted}
        ?playsinline=${this.playsInline}
        ?controls=${this.controls}
        poster=${ifDefined(this.posterUrl)}
        @loadeddata=${this._loadedData}
      ></video>
    `;
  }

  public override connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated) {
      this._WebRTC();
    }
  }

  public override disconnectedCallback() {
    super.disconnectedCallback();
    this._cleanUp();
  }

  protected override updated(changedProperties: PropertyValues<this>) {
    if (!changedProperties.has("entityid")) {
      return;
    }
    if (!this._videoEl) {
      return;
    }
    this._WebRTC();
  }

  private async _WebRTC(): Promise<void> {
    console.time("WebRTC");

    this._error = undefined;

    console.timeLog("WebRTC", "start clientConfig");

    const clientConfig = await fetchWebRtcClientConfiguration(
      this.hass,
      this.entityid
    );

    console.timeLog("WebRTC", "end clientConfig", clientConfig);

    const peerConnection = new RTCPeerConnection(clientConfig.configuration);

    if (clientConfig.dataChannel) {
      // Some cameras (such as nest) require a data channel to establish a stream
      // however, not used by any integrations.
      peerConnection.createDataChannel(clientConfig.dataChannel);
    }
    peerConnection.addTransceiver("audio", { direction: "recvonly" });
    peerConnection.addTransceiver("video", { direction: "recvonly" });

    const offerOptions: RTCOfferOptions = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    };

    console.timeLog("WebRTC", "start createOffer", offerOptions);

    const offer: RTCSessionDescriptionInit =
      await peerConnection.createOffer(offerOptions);

    console.timeLog("WebRTC", "end createOffer", offer);

    console.timeLog("WebRTC", "start setLocalDescription");

    await peerConnection.setLocalDescription(offer);

    console.timeLog("WebRTC", "end setLocalDescription");

    console.timeLog("WebRTC", "start iceResolver");

    let candidates = ""; // Build an Offer SDP string with ice candidates
    const iceResolver = new Promise<void>((resolve) => {
      peerConnection.addEventListener("icecandidate", async (event) => {
        if (!event.candidate?.candidate) {
          resolve(); // Gathering complete
          return;
        }
        candidates += `a=${event.candidate.candidate}\r\n`;
      });
    });
    await iceResolver;

    console.timeLog("WebRTC", "end iceResolver", candidates);

    const offer_sdp = offer.sdp! + candidates;

    let webRtcAnswer: WebRtcAnswer;
    try {
      console.timeLog("WebRTC", "start WebRTCOffer", offer_sdp);
      webRtcAnswer = await handleWebRtcOffer(
        this.hass,
        this.entityid,
        offer_sdp
      );
      console.timeLog("WebRTC", "end webRtcOffer", webRtcAnswer);
    } catch (err: any) {
      this._error = "Failed to start WebRTC stream: " + err.message;
      peerConnection.close();
      return;
    }

    // Setup callbacks to render remote stream once media tracks are discovered.
    const remoteStream = new MediaStream();
    peerConnection.addEventListener("track", (event) => {
      console.timeLog("WebRTC", "track", event);
      remoteStream.addTrack(event.track);
      this._videoEl.srcObject = remoteStream;
    });
    this._remoteStream = remoteStream;

    // Initiate the stream with the remote device
    const remoteDesc = new RTCSessionDescription({
      type: "answer",
      sdp: webRtcAnswer.answer,
    });
    try {
      console.timeLog("WebRTC", "start setRemoteDescription", remoteDesc);
      await peerConnection.setRemoteDescription(remoteDesc);
      console.timeLog("WebRTC", "end setRemoteDescription");
    } catch (err: any) {
      this._error = "Failed to connect WebRTC stream: " + err.message;
      peerConnection.close();
      return;
    }
    this._peerConnection = peerConnection;
    console.timeEnd("WebRTC");
  }

  private _cleanUp() {
    if (this._remoteStream) {
      this._remoteStream.getTracks().forEach((track) => {
        track.stop();
      });
      this._remoteStream = undefined;
    }
    if (this._videoEl) {
      this._videoEl.removeAttribute("src");
      this._videoEl.load();
    }
    if (this._peerConnection) {
      this._peerConnection.close();
      this._peerConnection = undefined;
    }
  }

  private _loadedData() {
    // @ts-ignore
    fireEvent(this, "load");
  }

  static get styles(): CSSResultGroup {
    return css`
      :host,
      video {
        display: block;
      }

      video {
        width: 100%;
        max-height: var(--video-max-height, calc(100vh - 97px));
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-web-rtc-player": HaWebRtcPlayer;
  }
}
