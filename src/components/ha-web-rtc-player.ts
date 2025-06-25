import "./ha-spinner";
import "@material/mwc-button";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, nothing, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import {
  mdiMicrophone,
  mdiMicrophoneOff,
  mdiVolumeHigh,
  mdiVolumeOff,
  mdiPlay,
  mdiPause,
} from "@mdi/js";
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

  @property({ type: Boolean, attribute: "twowayaudio" })
  public twowayaudio = false;

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

  private _localReturnTrackAdded: boolean = false;

  private _localReturnAudioTrack?: MediaStreamTrack;

  private _paused: boolean = false;

  private _twoWayAudio: boolean = false;
  
  private _timer_running: boolean = false;

  private async _addLocalReturnAudio() {
    const tracks = await this._getMediaTracks("user", {
      video: false,
      audio: true,
    });
    if (tracks && tracks.length > 0) {
      this._localReturnAudioTrack = tracks[0];

      // Transceivers are in the order they were added
      const audio_transceiver = this._peerConnection?.getTransceivers()[0];
      audio_transceiver!.direction = "sendrecv";
      audio_transceiver!.sender.replaceTrack(this._localReturnAudioTrack);

      this._localReturnTrackAdded = true;
    } else {
      this._logEvent("unable to add audio send track");
      this._twoWayAudio = false;
      this.requestUpdate();
    }
  }

  public async toggleMic() {
    if (!this._localReturnTrackAdded) {
      await this._addLocalReturnAudio();
    } else {
      this._localReturnAudioTrack!.enabled =
        !this._localReturnAudioTrack!.enabled;
    }
    this.requestUpdate();
  }

  public toggleMute() {
    this._videoEl.muted = !this._videoEl.muted;
    this.requestUpdate();
  }

  public togglePause() {
    const pause = () => {
      if (this._remoteStream && this._remoteStream.active) {
        this._remoteStream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
        this._remoteStream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
        this._paused = true;
      }
    };

    const resume = () => {
      if (this._remoteStream && this._remoteStream.active) {
        this._remoteStream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
        this._remoteStream.getVideoTracks().forEach((track) => {
          track.enabled = true;
        });
        this._paused = false;
      }
    };

    if (this._paused) {
      resume();
    } else {
      pause();
    }
    this.requestUpdate();
  }

  private _unsub?: Promise<UnsubscribeFunc>;

  private _sessionId?: string;

  private _candidatesList: RTCIceCandidate[] = [];

  protected override render(): TemplateResult {
    if (this._error) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }
    // The standard controls will still be disabled until the remoteStream is
    // created so they don't appear and disappear once twoWayAudio is requested
    // and enabled.
    const standardControls = this._twoWayAudio ? false : this.controls;

    const videoHtml = html` <video
      id="remote-stream"
      ?autoplay=${this.autoPlay}
      .muted=${this.muted}
      ?playsinline=${this.playsInline}
      ?controls=${standardControls && this._remoteStream !== undefined}
      poster=${ifDefined(this.posterUrl)}
      @loadeddata=${this._loadedData}
      style=${styleMap({
        height: this.aspectRatio == null ? "100%" : "auto",
        aspectRatio: this.aspectRatio,
        objectFit: this.fitMode,
      })}
    ></video>`;
    const progressHtml =
      this._remoteStream !== undefined
        ? nothing
        : html`
            <div class="video-progress">
              <ha-spinner
                class="render-spinner"
                size="medium"
              ></ha-spinner>
            </div>
          `;
    // Custom controls are required for two way audio to allow muting/unmuting
    // the microphone
    const customControls = standardControls
      ? nothing
      : html`
          <div class="video-controls">
            <mwc-button @click=${this.togglePause} halign id="toggle_pause">
              <ha-svg-icon
                .path=${this._paused ? mdiPlay : mdiPause}
              ></ha-svg-icon>
            </mwc-button>
            <mwc-button
              @click=${this.toggleMute}
              halign
              id="toggle_mute"
              class="video-controls-right"
            >
              <ha-svg-icon
                .path=${this._videoEl.muted ? mdiVolumeOff : mdiVolumeHigh}
              ></ha-svg-icon>
            </mwc-button>
            <mwc-button
              @click=${this.toggleMic}
              halign
              id="toggle_mic"
              class="video-controls-right"
            >
              <ha-svg-icon
                .path=${this._localReturnAudioTrack &&
                this._localReturnAudioTrack!.enabled
                  ? mdiMicrophone
                  : mdiMicrophoneOff}
              ></ha-svg-icon>
            </mwc-button>
          </div>
        `;
    return html`
      <div class="video-container">
        ${videoHtml}${progressHtml}${customControls}
      </div>
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

    this._error = undefined;

    this._startTimer();

    this._logEvent("start clientConfig");

    this._clientConfig = await fetchWebRtcClientConfiguration(
      this.hass,
      this.entityid
    );

    this._logEvent("end clientConfig", this._clientConfig);

    // On most platforms mediaDevices will be undefined if not running in a secure context
    this._twoWayAudio =
      this.twowayaudio && navigator.mediaDevices !== undefined;

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
      this._unsub = webRtcOffer(
        this.hass,
        this.entityid,
        offer_sdp,
        (event) => this._handleOfferEvent(event),
        this._sessionId
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
    if (this._peerConnection?.iceConnectionState === "connected") {
      this.requestUpdate();
    }
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

  private async _getMediaTracks(media, constraints) {
    try {
      const stream =
        media === "user"
          ? await navigator.mediaDevices.getUserMedia(constraints)
          : await navigator.mediaDevices.getDisplayMedia(constraints);
      return stream.getTracks();
    } catch (err: any) {
      this._error = "Failed to get media tracks: " + err.message;
      return [];
    }
  }

  private _cleanUp() {
    if (this._remoteStream) {
      this._remoteStream.getTracks().forEach((track) => {
        track.stop();
      });

      this._remoteStream = undefined;
    }
    if (this._localReturnAudioTrack) {
      this._localReturnAudioTrack.stop();
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
    this._timer_running = true;
  }

  private _stopTimer() {
    if (!__DEV__) {
      return;
    }
    this._timer_running = false;
    // eslint-disable-next-line no-console
    console.timeEnd("WebRTC");
  }

  private _logEvent(msg: string, ...args: unknown[]) {
    if (!__DEV__) {
      return;
    }
    if (!this._timer_running) {
      // eslint-disable-next-line no-console
      console.log("WebRTC:", msg, ...args)
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

    .video-container {
      position: relative;
    }

    .video-controls {
      width: 100%;
      background: rgba(0, 0, 0, 0.35);
      position: absolute;
      bottom: 0;
      left: 0;
      z-index: 10;
    }

    .video-progress {
      position: absolute;
      top: 50%;
      left: 50%;
      z-index: 10;
    }

    .video-controls-right {
      float: right;
    }

    mwc-button {
      --mdc-theme-primary: white;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-web-rtc-player": HaWebRtcPlayer;
  }
}
