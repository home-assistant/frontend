/* eslint-disable no-console */
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
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
    if (this.hasUpdated && this.entityid) {
      this._startWebRtc();
    }
  }

  public override disconnectedCallback() {
    super.disconnectedCallback();
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

    console.time("WebRTC");

    this._error = undefined;

    console.timeLog("WebRTC", "start clientConfig");

    this._clientConfig = await fetchWebRtcClientConfiguration(
      this.hass,
      this.entityid
    );

    console.timeLog("WebRTC", "end clientConfig", this._clientConfig);

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
          console.timeLog("WebRTC", "ICE negotiation complete");
          break;
        default:
          console.timeLog(
            "WebRTC",
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

    console.timeLog("WebRTC", "start createOffer", offerOptions);

    const offer: RTCSessionDescriptionInit =
      await this._peerConnection.createOffer(offerOptions);

    if (!this._peerConnection) {
      return;
    }

    console.timeLog("WebRTC", "end createOffer", offer);

    console.timeLog("WebRTC", "start setLocalDescription");

    await this._peerConnection.setLocalDescription(offer);

    if (!this._peerConnection || !this.entityid) {
      return;
    }

    console.timeLog("WebRTC", "end setLocalDescription");

    let candidates = "";

    if (this._clientConfig?.getCandidatesUpfront) {
      await new Promise<void>((resolve) => {
        this._peerConnection!.onicegatheringstatechange = (ev: Event) => {
          const iceGatheringState = (ev.target as RTCPeerConnection)
            .iceGatheringState;
          if (iceGatheringState === "complete") {
            this._peerConnection!.onicegatheringstatechange = null;
            resolve();
          }

          console.timeLog(
            "WebRTC",
            "Ice gathering state changed",
            iceGatheringState
          );
        };
      });

      if (!this._peerConnection || !this.entityid) {
        return;
      }
    }

    while (this._candidatesList.length) {
      const candidate = this._candidatesList.pop();
      if (candidate) {
        candidates += `a=${candidate}\r\n`;
      }
    }

    const offer_sdp = offer.sdp! + candidates;

    console.timeLog("WebRTC", "start webRtcOffer", offer_sdp);

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
    console.timeLog(
      "WebRTC",
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
        // sdpMLineIndex is always populated
        addWebRtcCandidate(
          this.hass,
          this.entityid!,
          event.session_id,
          candidate.candidate,
          candidate?.sdpMLineIndex || 0
        )
      );
      this._candidatesList = [];
    }
    if (event.type === "answer") {
      console.timeLog("WebRTC", "answer", event.answer);

      this._handleAnswer(event);
    }
    if (event.type === "candidate") {
      console.timeLog("WebRTC", "remote ice candidate", event.candidate);

      try {
        await this._peerConnection?.addIceCandidate(
          new RTCIceCandidate({
            candidate: event.candidate,
            sdpMLineIndex: event.sdp_m_line_index,
          })
        );
      } catch (err: any) {
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

    console.timeLog(
      "WebRTC",
      "local ice candidate",
      event.candidate?.candidate,
      event.candidate?.sdpMLineIndex
    );

    if (this._sessionId) {
      // sdpMLineIndex is always populated
      const sdpMLineIndex = event.candidate?.sdpMLineIndex || 0;
      addWebRtcCandidate(
        this.hass,
        this.entityid,
        this._sessionId,
        event.candidate?.candidate,
        sdpMLineIndex
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
      console.timeLog("WebRTC", "start setRemoteDescription", remoteDesc);
      await this._peerConnection.setRemoteDescription(remoteDesc);
    } catch (err: any) {
      this._error = "Failed to connect WebRTC stream: " + err.message;
      this._cleanUp();
    }
    console.timeLog("WebRTC", "end setRemoteDescription");
  }

  private _cleanUp() {
    console.timeLog("WebRTC", "stopped");
    console.timeEnd("WebRTC");

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
    }
    this._unsub?.then((unsub) => unsub());
    this._unsub = undefined;
    this._sessionId = undefined;
    this._candidatesList = [];
  }

  private _loadedData() {
    console.timeLog("WebRTC", "loadedData");
    console.timeEnd("WebRTC");

    const video = this._videoEl;
    const stream = video.srcObject as MediaStream;

    fireEvent(this, "load");
    fireEvent(this, "streams", {
      hasAudio: Boolean(stream?.getAudioTracks().length),
      hasVideo: Boolean(stream?.getVideoTracks().length),
    });
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
