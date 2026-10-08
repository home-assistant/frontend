import type { ContextType } from "@lit/context";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { styleMap } from "lit/directives/style-map";
import { consume } from "../common/decorators/consume";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { fireEvent } from "../common/dom/fire_event";
import type { LocalizeFunc } from "../common/translations/localize";
import {
  addWebRtcCandidate,
  fetchWebRtcClientConfiguration,
  type WebRtcAnswer,
  type WebRTCClientConfiguration,
  webRtcOffer,
  type WebRtcOfferEvent,
} from "../data/camera";
import { apiContext, connectionContext } from "../data/context";
import "./ha-alert";
import "./ha-spinner";
import { showToast } from "../util/toast";

const HIDDEN_CLEANUP_DELAY = 60000;

interface WebRtcPlayerError {
  type: "not_supported" | "start_failed" | "connect_failed";
  message?: string;
}

export type WebRtcMicrophoneState = "off" | "connecting" | "on" | "denied";

/**
 * A WebRTC stream is established by first sending an offer through a signal
 * path via an integration. An answer is returned, then the rest of the stream
 * is handled entirely client side.
 */
@customElement("ha-web-rtc-player")
export class HaWebRtcPlayer extends LitElement {
  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  @state()
  @consume({ context: connectionContext, subscribe: true })
  private _connection!: ContextType<typeof connectionContext>;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

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

  @state() private _error?: WebRtcPlayerError;

  @state() private _reconnectPoster?: string;

  @query("#remote-stream") private _videoEl!: HTMLVideoElement;

  private _clientConfig?: WebRTCClientConfiguration;

  private _peerConnection?: RTCPeerConnection;

  private _remoteStream?: MediaStream;

  private _localReturnAudioTrack?: MediaStreamTrack;

  private _microphoneSender?: RTCRtpSender;

  private _timer_running = false;

  private _microphoneConnecting = false;

  private _microphoneDenied = false;

  public get microphoneState(): WebRtcMicrophoneState {
    if (this._microphoneDenied) {
      return "denied";
    }
    if (this._microphoneConnecting) {
      return "connecting";
    }
    return this._localReturnAudioTrack ? "on" : "off";
  }

  public get microphoneTrack(): MediaStreamTrack | undefined {
    return this._localReturnAudioTrack;
  }

  public async toggleMicrophone() {
    if (this._localReturnAudioTrack) {
      // Stop instead of disabling the track, so the browser releases the
      // microphone, the connection keeps running without it
      this._localReturnAudioTrack.stop();
      this._localReturnAudioTrack = undefined;
      this._fireMicrophoneChanged();
      await this._microphoneSender?.replaceTrack(null).catch(() => undefined);
      return;
    }
    if (this._microphoneConnecting || this._microphoneDenied) {
      return;
    }

    this._microphoneConnecting = true;
    this._fireMicrophoneChanged();
    const track = await this._getMicrophoneTrack();
    // Cleaned up (closed, hidden or entity changed) while asking for it
    if (!this._microphoneConnecting || !this.isConnected) {
      track?.stop();
      return;
    }
    if (!track) {
      this._logEvent("unable to add audio send track");
      this._microphoneConnecting = false;
      this._fireMicrophoneChanged();
      return;
    }
    this._logEvent("found microphone to use for audio return track");
    if (this._microphoneSender) {
      // The connection was already set up with a microphone, swap it back in
      try {
        await this._microphoneSender.replaceTrack(track);
        this._localReturnAudioTrack = track;
      } catch (_err: unknown) {
        track.stop();
      }
      this._microphoneConnecting = false;
      this._fireMicrophoneChanged();
      return;
    }
    // Renegotiating the existing connection is not supported by all providers
    // (go2rtc answers with a new DTLS fingerprint, which Firefox rejects), so
    // start a new connection and session with the microphone track instead.
    this._captureReconnectFrame();
    await this._startWebRtc(track);
  }

  private _captureReconnectFrame() {
    const video = this._videoEl;
    if (!video?.videoWidth || !video.videoHeight) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    this._reconnectPoster = canvas.toDataURL("image/jpeg");
  }

  private _fireMicrophoneChanged() {
    fireEvent(this, "microphone-changed", { state: this.microphoneState });
  }

  private _unsub?: Promise<UnsubscribeFunc>;

  private _sessionId?: string;

  private _candidatesList: RTCIceCandidate[] = [];

  private _hiddenCleanupTimeout?: number;

  private _cleanUpCount = 0;

  private _handleVisibilityChange = () => {
    if (document.pictureInPictureElement) {
      // video is playing in picture-in-picture mode, don't do anything
      return;
    }
    if (document.hidden) {
      this._hiddenCleanupTimeout = window.setTimeout(() => {
        this._hiddenCleanupTimeout = undefined;
        this._cleanUp();
      }, HIDDEN_CLEANUP_DELAY);
    } else if (this._hiddenCleanupTimeout) {
      // stream was not cleaned up yet, just cancel the cleanup
      clearTimeout(this._hiddenCleanupTimeout);
      this._hiddenCleanupTimeout = undefined;
    } else {
      this._startWebRtc();
    }
  };

  protected override render(): TemplateResult {
    if (this._error) {
      return html`<ha-alert alert-type="error">
        ${this._localize(`ui.components.web-rtc-player.${this._error.type}`, {
          message: this._error.message ?? "",
        })}
      </ha-alert>`;
    }
    return html`
      <video
        id="remote-stream"
        ?autoplay=${this.autoPlay}
        .muted=${this.muted}
        ?playsinline=${this.playsInline}
        ?controls=${this.controls}
        poster=${ifDefined(this._reconnectPoster ?? this.posterUrl)}
        @loadeddata=${this._loadedData}
        @resize=${this._videoResized}
        style=${styleMap({
          height: this.aspectRatio == null ? "100%" : "auto",
          aspectRatio: this.aspectRatio,
          objectFit: this.fitMode,
        })}
      ></video>
      ${
        this._reconnectPoster
          ? html`<div class="reconnecting">
              <ha-spinner size="medium"></ha-spinner>
            </div>`
          : nothing
      }
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
    clearTimeout(this._hiddenCleanupTimeout);
    this._hiddenCleanupTimeout = undefined;
    this._cleanUp();
  }

  protected override willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    if (!changedProperties.has("entityid")) {
      return;
    }
    this._startWebRtc();
  }

  private async _startWebRtc(
    localReturnAudioTrack?: MediaStreamTrack
  ): Promise<void> {
    this._cleanUp();

    if (localReturnAudioTrack) {
      this._localReturnAudioTrack = localReturnAudioTrack;
      this._microphoneConnecting = true;
      this._fireMicrophoneChanged();
    }

    // Browser support required for WebRTC
    if (typeof RTCPeerConnection === "undefined") {
      this._error = { type: "not_supported" };
      fireEvent(this, "streams", { hasAudio: false, hasVideo: false });
      return;
    }

    if (
      !this._api ||
      !this._connection ||
      !this.entityid ||
      !this.isConnected
    ) {
      return;
    }

    this._error = undefined;

    this._startTimer();

    const cleanUpCountAtStart = this._cleanUpCount;

    this._logEvent("start clientConfig");

    let clientConfig: WebRTCClientConfiguration;
    try {
      clientConfig = await fetchWebRtcClientConfiguration(
        this._api,
        this.entityid
      );
    } catch (err: any) {
      if (cleanUpCountAtStart === this._cleanUpCount) {
        this._error = { type: "start_failed", message: err.message };
        this._cleanUp();
      }
      return;
    }

    if (cleanUpCountAtStart !== this._cleanUpCount) {
      return;
    }

    this._clientConfig = clientConfig;

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

    if (this._localReturnAudioTrack) {
      this._microphoneSender = this._peerConnection.addTransceiver(
        this._localReturnAudioTrack,
        { direction: "sendrecv" }
      ).sender;
    } else {
      this._peerConnection.addTransceiver("audio", { direction: "recvonly" });
    }
    this._peerConnection.addTransceiver("video", { direction: "recvonly" });
  }

  private _startNegotiation = async () => {
    const peerConnection = this._peerConnection;
    if (!peerConnection) {
      return;
    }

    const offerOptions: RTCOfferOptions = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    };

    this._logEvent("start createOffer", offerOptions);

    const offer: RTCSessionDescriptionInit =
      await peerConnection.createOffer(offerOptions);

    if (this._peerConnection !== peerConnection) {
      return;
    }

    this._logEvent("end createOffer", offer);

    this._logEvent("start setLocalDescription");

    await peerConnection.setLocalDescription(offer);

    if (this._peerConnection !== peerConnection || !this.entityid) {
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

    this._unsub = webRtcOffer(
      this._connection,
      this.entityid,
      offer_sdp,
      (event) => this._handleOfferEvent(peerConnection, event)
    );
    this._unsub.catch((err) => {
      if (this._peerConnection !== peerConnection) {
        return;
      }
      this._unsub = undefined;
      this._error = { type: "start_failed", message: err.message };
      this._cleanUp();
    });
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

  private async _handleOfferEvent(
    peerConnection: RTCPeerConnection,
    event: WebRtcOfferEvent
  ) {
    // Ignore events of a subscription that belongs to a superseded start
    if (this._peerConnection !== peerConnection || !this.entityid) {
      return;
    }
    if (event.type === "session") {
      this._sessionId = event.session_id;
      this._candidatesList.forEach((candidate) =>
        addWebRtcCandidate(
          this._api,
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

      this._handleAnswer(peerConnection, event);
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

        await peerConnection.addIceCandidate(candidate);
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }
    if (event.type === "error") {
      this._error = { type: "start_failed", message: event.message };
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
        this._api,
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
    // If the track is audio and the player is muted, we do not add it to the stream.
    if (event.track.kind === "audio" && this.muted) {
      return;
    }
    this._remoteStream.addTrack(event.track);
    if (!this.hasUpdated) {
      await this.updateComplete;
    }
    this._videoEl.srcObject = this._remoteStream;
  };

  private async _handleAnswer(
    peerConnection: RTCPeerConnection,
    event: WebRtcAnswer
  ) {
    if (["stable", "closed"].includes(peerConnection.signalingState)) {
      return;
    }

    // Initiate the stream with the remote device
    const remoteDesc = new RTCSessionDescription({
      type: "answer",
      sdp: event.answer,
    });
    try {
      this._logEvent("start setRemoteDescription", remoteDesc);
      await peerConnection.setRemoteDescription(remoteDesc);
    } catch (err: any) {
      // Closing a superseded connection rejects its pending operations
      if (this._peerConnection !== peerConnection) {
        return;
      }
      this._error = { type: "connect_failed", message: err.message };
      this._cleanUp();
    }
    this._logEvent("end setRemoteDescription");
  }

  private async _getMicrophoneTrack(): Promise<MediaStreamTrack | undefined> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      return stream.getAudioTracks()[0];
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        this._microphoneDenied = true;
        return undefined;
      }
      // A missing or busy microphone should not replace the running video
      showToast(this, {
        message: this._localize(
          "ui.components.web-rtc-player.microphone_failed",
          { message: err instanceof Error ? err.message : String(err) }
        ),
      });
      return undefined;
    }
  }

  private _cleanUp() {
    this._cleanUpCount++;
    if (this._remoteStream) {
      this._remoteStream.getTracks().forEach((track) => {
        track.stop();
      });

      this._remoteStream = undefined;
    }
    if (this._localReturnAudioTrack || this._microphoneConnecting) {
      this._localReturnAudioTrack?.stop();
      this._localReturnAudioTrack = undefined;
      this._microphoneConnecting = false;
      this._fireMicrophoneChanged();
    }
    const videoEl = this._videoEl;
    if (videoEl) {
      videoEl.srcObject = null;
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
      this._microphoneSender = undefined;

      this._logEvent("stopped");
      this._stopTimer();
    }
    // A rejected subscription is already handled in _startNegotiation
    this._unsub?.then(
      (unsub) => unsub(),
      () => undefined
    );
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

    if (this._microphoneConnecting) {
      this._microphoneConnecting = false;
      this._fireMicrophoneChanged();
    }
  }

  private _videoResized() {
    if (this._videoEl.videoWidth && this._videoEl.videoHeight) {
      this._reconnectPoster = undefined;
    }
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
      console.log("WebRTC:", msg, ...args);
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

    :host {
      position: relative;
    }

    video {
      width: 100%;
      max-height: var(--video-max-height, calc(100vh - 97px));
    }

    .reconnecting {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(0, 0, 0, 0.4);
      --ha-spinner-indicator-color: white;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-web-rtc-player": HaWebRtcPlayer;
  }
  interface HASSDomEvents {
    "microphone-changed": { state: WebRtcMicrophoneState };
  }
}
