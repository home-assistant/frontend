import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../common/dom/fire_event";
import {
  addWebRtcCandidate,
  fetchWebRtcClientConfiguration,
  type WebRtcAnswer,
  type WebRTCClientConfiguration,
  webRtcOffer,
  type WebRtcOfferEvent,
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

  @property() public entityid?: string;

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

  @property({ attribute: "poster-url" }) public posterUrl?: string;

  @state() private _error?: string;

  @query("#remote-stream") private _videoEl!: HTMLVideoElement;

  private _clientConfig?: WebRTCClientConfiguration;

  private _peerConnection?: RTCPeerConnection;

  private _remoteStream?: MediaStream;

  private _unsub?: Promise<UnsubscribeFunc>;

  private _sessionId?: string;

  private _candidatesList: RTCIceCandidate[] = [];

  private _handleVisibilityChange = () => {
    if (document.hidden) {
      this._cleanUp();
    } else {
      this._startWebRtc();
    }
  };

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
        style=${styleMap({
          height: this.aspectRatio == null ? "100%" : "auto",
          aspectRatio: this.aspectRatio,
          objectFit: this.fitMode,
        })}
      ></video>
    `;
  }

  public override connectedCallback() {
    super.connectedCallback();
    if (this.hasUpdated && this.entityid) {
      this._startWebRtc();
    }
    document.addEventListener("visibilitychange", this._handleVisibilityChange);
  }

  public override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(
      "visibilitychange",
      this._handleVisibilityChange
    );
    this._cleanUp();
  }

  protected override willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    if (!changedProperties.has("entityid")) {
      return;
    }
    this._startWebRtc();
  }

  private async _startWebRtc(): Promise<void> {
    this._cleanUp();

    // Browser support required for WebRTC
    if (typeof RTCPeerConnection === "undefined") {
      this._error = "WebRTC is not supported in this browser";
      fireEvent(this, "streams", { hasAudio: false, hasVideo: false });
      return;
    }

    if (!this.hass || !this.entityid) {
      return;
    }

    this._error = undefined;

    this._startTimer();

    this._logEvent("start clientConfig");

    this._clientConfig = await fetchWebRtcClientConfiguration(
      this.hass,
      this.entityid
    );

    this._logEvent("end clientConfig", this._clientConfig);

    this._peerConnection = new RTCPeerConnection(
      this._clientConfig.configuration
    );

    if (this._clientConfig.dataChannel) {
      // Some cameras (such as nest) require a data channel to establish a stream
      // however, not used by any integrations.
      this._peerConnection.createDataChannel(this._clientConfig.dataChannel);
    }

    this._peerConnection.onnegotiationneeded = this._startNegotiation;

    this._peerConnection.onicecandidate = this._handleIceCandidate;
    this._peerConnection.oniceconnectionstatechange =
      this._iceConnectionStateChanged;

    // just for debugging
    this._peerConnection.onsignalingstatechange = (ev) => {
      switch ((ev.target as RTCPeerConnection).signalingState) {
        case "stable":
          this._logEvent("ICE negotiation complete");
          break;
        default:
          this._logEvent(
            "Signaling state changed",
            (ev.target as RTCPeerConnection).signalingState
          );
      }
    };

    // Setup callbacks to render remote stream once media tracks are discovered.
    this._remoteStream = new MediaStream();
    this._peerConnection.ontrack = this._addTrack;

    this._peerConnection.addTransceiver("audio", { direction: "recvonly" });
    this._peerConnection.addTransceiver("video", { direction: "recvonly" });
  }

  private _startNegotiation = async () => {
    if (!this._peerConnection) {
      return;
    }

    const offerOptions: RTCOfferOptions = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    };

    this._logEvent("start createOffer", offerOptions);

    const offer: RTCSessionDescriptionInit =
      await this._peerConnection.createOffer(offerOptions);

    if (!this._peerConnection) {
      return;
    }

    this._logEvent("end createOffer", offer);

    this._logEvent("start setLocalDescription");

    await this._peerConnection.setLocalDescription(offer);

    if (!this._peerConnection || !this.entityid) {
      return;
    }

    this._logEvent("end setLocalDescription");

    let candidates = "";

    while (this._candidatesList.length) {
      const candidate = this._candidatesList.pop();
      if (candidate) {
        candidates += `a=${candidate}\r\n`;
      }
    }

    const offer_sdp = offer.sdp! + candidates;

    this._logEvent("start webRtcOffer", offer_sdp);

    try {
      this._unsub = webRtcOffer(this.hass, this.entityid, offer_sdp, (event) =>
        this._handleOfferEvent(event)
      );
    } catch (err: any) {
      this._error = "Failed to start WebRTC stream: " + err.message;
      this._cleanUp();
    }
  };

  private _iceConnectionStateChanged = () => {
    this._logEvent(
      "ice connection state change",
      this._peerConnection?.iceConnectionState
    );
    if (this._peerConnection?.iceConnectionState === "failed") {
      this._peerConnection.restartIce();
    }
  };

  private async _handleOfferEvent(event: WebRtcOfferEvent) {
    if (!this.entityid) {
      return;
    }
    if (event.type === "session") {
      this._sessionId = event.session_id;
      this._candidatesList.forEach((candidate) =>
        addWebRtcCandidate(
          this.hass,
          this.entityid!,
          event.session_id,
          // toJSON returns RTCIceCandidateInit
          candidate.toJSON()
        )
      );
      this._candidatesList = [];
    }
    if (event.type === "answer") {
      this._logEvent("answer", event.answer);

      this._handleAnswer(event);
    }
    if (event.type === "candidate") {
      this._logEvent("remote ice candidate", event.candidate);

      try {
        // The spdMid or sdpMLineIndex is required so set sdpMid="0" if not
        // sent from the backend.
        const candidate =
          event.candidate.sdpMid || event.candidate.sdpMLineIndex != null
            ? new RTCIceCandidate(event.candidate)
            : new RTCIceCandidate({
                candidate: event.candidate.candidate,
                sdpMid: "0",
              });

        await this._peerConnection?.addIceCandidate(candidate);
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }
    if (event.type === "error") {
      this._error = "Failed to start WebRTC stream: " + event.message;
      this._cleanUp();
    }
  }

  private _handleIceCandidate = (event: RTCPeerConnectionIceEvent) => {
    if (!this.entityid || !event.candidate?.candidate) {
      return;
    }

    this._logEvent(
      "local ice candidate",
      event.candidate?.candidate,
      event.candidate?.sdpMLineIndex
    );

    if (this._sessionId) {
      addWebRtcCandidate(
        this.hass,
        this.entityid,
        this._sessionId,
        // toJSON returns RTCIceCandidateInit
        event.candidate.toJSON()
      );
    } else {
      this._candidatesList.push(event.candidate);
    }
  };

  private _addTrack = async (event: RTCTrackEvent) => {
    if (!this._remoteStream) {
      return;
    }
    this._remoteStream.addTrack(event.track);
    if (!this.hasUpdated) {
      await this.updateComplete;
    }
    this._videoEl.srcObject = this._remoteStream;
  };

  private async _handleAnswer(event: WebRtcAnswer) {
    if (
      !this._peerConnection?.signalingState ||
      ["stable", "closed"].includes(this._peerConnection.signalingState)
    ) {
      return;
    }

    // Initiate the stream with the remote device
    const remoteDesc = new RTCSessionDescription({
      type: "answer",
      sdp: event.answer,
    });
    try {
      this._logEvent("start setRemoteDescription", remoteDesc);
      await this._peerConnection.setRemoteDescription(remoteDesc);
    } catch (err: any) {
      this._error = "Failed to connect WebRTC stream: " + err.message;
      this._cleanUp();
    }
    this._logEvent("end setRemoteDescription");
  }

  private _cleanUp() {
    if (this._remoteStream) {
      this._remoteStream.getTracks().forEach((track) => {
        track.stop();
      });

      this._remoteStream = undefined;
    }
    const videoEl = this._videoEl;
    if (videoEl) {
      videoEl.removeAttribute("src");
      videoEl.load();
    }
    if (this._peerConnection) {
      this._peerConnection.close();

      this._peerConnection.onnegotiationneeded = null;
      this._peerConnection.onicecandidate = null;
      this._peerConnection.oniceconnectionstatechange = null;
      this._peerConnection.onicegatheringstatechange = null;
      this._peerConnection.ontrack = null;

      // just for debugging
      this._peerConnection.onsignalingstatechange = null;

      this._peerConnection = undefined;

      this._logEvent("stopped");
      this._stopTimer();
    }
    this._unsub?.then((unsub) => unsub());
    this._unsub = undefined;
    this._sessionId = undefined;
    this._candidatesList = [];
  }

  private _loadedData() {
    const video = this._videoEl;
    const stream = video.srcObject as MediaStream;

    const data = {
      hasAudio: Boolean(stream?.getAudioTracks().length),
      hasVideo: Boolean(stream?.getVideoTracks().length),
    };

    fireEvent(this, "load");
    fireEvent(this, "streams", data);

    this._logEvent("loadedData", data);
    this._stopTimer();
  }

  private _startTimer() {
    if (!__DEV__) {
      return;
    }
    // eslint-disable-next-line no-console
    console.time("WebRTC");
  }

  private _stopTimer() {
    if (!__DEV__) {
      return;
    }
    // eslint-disable-next-line no-console
    console.timeEnd("WebRTC");
  }

  private _logEvent(msg: string, ...args: unknown[]) {
    if (!__DEV__) {
      return;
    }
    // eslint-disable-next-line no-console
    console.timeLog("WebRTC", msg, ...args);
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-web-rtc-player": HaWebRtcPlayer;
  }
}
